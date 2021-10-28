import Command, { APITypes as Nimbu, APIError, APIOptions } from '@nimbu-cli/command'
import { download, generateRandom } from '../../../utils/files'

import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import * as fs from 'fs-extra'
import { cloneDeep, intersection, uniq, compact, flatten, chunk, sumBy, sum } from 'lodash'
import {
  Channel,
  ChannelEntry,
  ChannelEntryFile,
  ChannelEntryReferenceMany,
  ChannelEntryReferenceSingle,
  Customer,
  CustomField,
  FieldType,
  FileField,
  isFieldOf,
  isFileField,
  isRelationalField,
  RegularField,
  RelationalField,
  SelectField,
} from '../../../nimbu/types'
import { fetchAllChannels } from '../../../utils/channels'

type CopySingle = {
  fromSite: string
  toSite: string
  fromChannel: string
  fromChannelOriginal?: string
  toChannel: string
  channel: Channel
  entries: ChannelEntry[]
  nbEntries?: number
  fileFields: FileField[]
  galleryFields: RegularField[]
  selectFields: SelectField[]
  multiSelectFields: SelectField[]
  customerFields: RelationalField[]
  referenceFields: RelationalField[]
  selfReferences: RelationalField[]
  query?: string
  where?: string
  per_page?: string
  upsert?: string
  files: {
    [k: string]: { path: string; cleanup: any }
  }
}

type CopySingleRecursive = {
  fromSite: string
  toSite: string
  fromChannel: string
  toChannel: string
  query?: string
  where?: string
  per_page?: string
  upsert?: string
  only?: string
  channels: Channel[]
}

export default class CopyChannels extends Command {
  static description = 'copy channel entries from one to another'

  static flags = {
    from: flags.string({
      char: 'f',
      description: 'slug of the source channel',
      required: true,
    }),
    to: flags.string({
      char: 't',
      description: 'slug of the target channel',
      required: true,
    }),
    query: flags.string({
      char: 'q',
      description: 'query params to append to source channel api call',
    }),
    where: flags.string({
      char: 'w',
      description: 'query expression to filter the source channel',
    }),
    upsert: flags.string({
      char: 'u',
      description: 'name of parameter to use for matching existing documents',
    }),
    'per-page': flags.string({
      char: 'p',
      description: 'number of entries to fetch per page',
    }),
    recursive: flags.boolean({
      char: 'r',
      description: 'automatically copy all dependent objects',
    }),
    only: flags.string({
      description: 'limit copy of channels to this list (comma-separated)',
    }),
    'copy-customers': flags.boolean({
      description: 'copy and replicate all owners related to the objects we are copying',
    }),
    'allow-errors': flags.boolean({
      description: 'do not stop when an item fails and continue with the other',
    }),
  }

  // mapping of ids in source site to newly created items in target site
  private idMapping: {
    [channelSlug: string]: {
      [id: string]: string | null
    }
  } = {}

  private abortOnError = true
  private warnings: string[] = []

  async execute() {
    const { flags } = this.parse(CopyChannels)

    if (process.env.DEBUG != null) {
      process.stdout.isTTY = false
    }

    if (flags['allow-errors']) {
      this.abortOnError = false
    }

    if (flags.recursive) {
      await this.executeRecursiveCopy()
    } else {
      await this.executeSingleCopy()
    }
  }

  async executeSingleCopy(channel?: string) {
    const Listr = require('listr')
    const { flags } = this.parse(CopyChannels)

    const { fromChannel, toChannel, fromSite, toSite } = this.getFromTo()

    const tasks = new Listr([
      {
        title: `Fetching channel information ${chalk.bold(channel || fromChannel)} from site ${chalk.bold(fromSite)}`,
        task: (ctx: CopySingle) => this.fetchChannel(ctx),
      },
      {
        title: `Querying entries from channel ${chalk.bold(channel || fromChannel)}`,
        task: (ctx: CopySingle, task) => this.queryChannel(ctx, task),
      },
      {
        title: `Downloading attachments from channel ${chalk.bold(channel || fromChannel)}`,
        enabled: (ctx: CopySingle) =>
          (ctx.fileFields && ctx.fileFields.length > 0) || (ctx.galleryFields && ctx.galleryFields.length > 0),
        task: (ctx: CopySingle) => this.downloadAttachments(ctx),
      },
      {
        title: `Creating entries in channel ${chalk.bold(toChannel)} for site ${chalk.bold(toSite)}`,
        skip: (ctx: CopySingle) => ctx.entries.length === 0,
        task: (ctx: CopySingle) => this.createEntries(ctx),
      },
      {
        title: `Updating self-references for new entries in channel ${chalk.bold(toChannel)}`,
        enabled: (ctx: CopySingle) => ctx.selfReferences && ctx.selfReferences.length > 0,
        task: (ctx: CopySingle) => this.updateEntries(ctx),
      },
    ])

    await tasks
      .run({
        fromChannel: channel || fromChannel,
        fromSite,
        toChannel: channel || toChannel,
        toSite,
        query: flags.query,
        where: flags.where,
        per_page: flags['per-page'],
        upsert: flags.upsert,
      })
      .catch((error) => this.error(error))

    this.printWarnings()
  }

  async executeRecursiveCopy() {
    const Listr = require('listr')
    const { flags } = this.parse(CopyChannels)

    const { fromChannel, toChannel, fromSite, toSite } = this.getFromTo()

    const tasks = new Listr(
      [
        {
          title: `Fetching related channel config for ${chalk.bold(fromChannel)} from site ${chalk.bold(fromSite)}`,
          task: (ctx: CopySingleRecursive) => this.fetchAllChannels(ctx),
        },
        {
          title: `Fetching which entries to copy from ${chalk.bold(fromChannel)}`,
          enabled: (ctx: CopySingleRecursive) => ctx.query != null || ctx.where != null,
          task: (ctx: CopySingle, task) => this.queryChannel(ctx, task),
        },
        {
          title: `Copying related channel entries to site ${chalk.bold(toSite)}`,
          enabled: (ctx: CopySingleRecursive) => ctx.channels != null && ctx.channels.length > 0,
          task: (ctx: CopySingleRecursive, task) => {
            return new Listr(
              [
                ...ctx.channels.map((channel) => ({
                  title: `Copying ${chalk.bold(channel.name)} (${channel.slug})`,
                  task: (ctx, task) => {
                    ctx.fromChannel = channel.slug
                    ctx.toChannel = channel.slug

                    return new Listr(
                      [
                        {
                          title: `Fetching detailed channel information for ${chalk.bold(channel.slug)}`,
                          task: (ctx: CopySingle) => this.fetchChannel(ctx),
                        },
                        {
                          title: `Querying channel entries`,
                          task: (ctx: CopySingle, task) => this.queryChannel(ctx, task),
                        },
                        {
                          title: `Querying related customers for fetched entries`,
                          task: (ctx: CopySingle, task) => this.queryRelatedCustomers(ctx, task),
                          skip: (ctx) => ctx.entries == null || ctx.entries.length < 1,
                          enabled: (ctx) => flags['copy-customers'],
                        },
                        {
                          title: `Downloading attachments`,
                          enabled: (ctx: CopySingle) =>
                            (ctx.fileFields && ctx.fileFields.length > 0) ||
                            (ctx.galleryFields && ctx.galleryFields.length > 0),
                          task: (ctx: CopySingle) => this.downloadAttachments(ctx),
                        },
                        {
                          title: `Creating entries in site ${chalk.bold(toSite)}`,
                          skip: (ctx: CopySingle) => ctx.entries.length === 0,
                          task: (ctx: CopySingle) => this.createEntries(ctx),
                        },
                        {
                          title: `Updating self-references`,
                          enabled: (ctx: CopySingle) => ctx.selfReferences && ctx.selfReferences.length > 0,
                          task: (ctx: CopySingle) => this.updateEntries(ctx),
                        },
                      ],
                      { collapse: false },
                    )
                  },
                })),
              ],
              { collapse: false },
            )
          },
        },
      ],
      { collapse: false },
    )

    await tasks
      .run({
        fromChannel,
        fromChannelOriginal: fromChannel,
        fromSite,
        toChannel,
        toSite,
        query: flags.query,
        where: flags.where,
        per_page: flags['per-page'],
        upsert: flags.upsert,
        only: flags.only,
      })
      .catch((error) => this.error(error))

    this.printWarnings()
  }

  private getFromTo() {
    const { flags } = this.parse(CopyChannels)

    let fromChannel: string
    let toChannel: string
    let fromSite: string | undefined
    let toSite: string | undefined

    let fromParts = flags.from.split('/')
    if (fromParts.length > 1) {
      fromSite = fromParts[0]
      fromChannel = fromParts[1]
    } else {
      fromSite = this.nimbuConfig.site
      fromChannel = fromParts[0]
    }
    let toParts = flags.to.split('/')
    if (toParts.length > 1) {
      toSite = toParts[0]
      toChannel = toParts[1]
    } else {
      toSite = this.nimbuConfig.site
      toChannel = toParts[0]
    }

    if (fromSite === undefined) {
      ux.error('You need to specify the source site.')
    }

    if (toSite === undefined) {
      ux.error('You need to specify the destination site.')
    }

    return { fromChannel, toChannel, fromSite, toSite }
  }

  private async fetchAllChannels(ctx: CopySingleRecursive) {
    this.debug(`Fetching all channels from ${ctx.fromSite}`)

    // first fetch all channel config from Nimbu
    const { channels, graph } = await fetchAllChannels(this, ctx.fromSite, { includeBuiltIns: true })

    // find all channels with references to the fromChannel
    const dependants = graph.dependantsOf(ctx.fromChannel)
    this.debug(`Found ${dependants.length} dependants: ${dependants.join(',')}`)

    let channelsWithReferences = channels.filter((channel) => dependants.includes(channel.slug))

    if (ctx.only != null) {
      // limit recursive copying to this selection of channels
      let channelsToConsider = ctx.only.split(',')
      channelsToConsider = intersection(
        channelsWithReferences.map((channel) => channel.slug),
        channelsToConsider,
      )
      channelsWithReferences = channelsWithReferences.filter((channel) => channelsToConsider.includes(channel.slug))
      this.debug(
        `Limiting recursion to ${channelsWithReferences.length} dependants: ${channelsWithReferences
          .map((c) => c.slug)
          .join(',')}`,
      )
    }

    ctx.channels = channelsWithReferences
  }

  private async fetchChannel(ctx: CopySingle) {
    let options: APIOptions = { site: ctx.fromSite }

    try {
      ctx.channel = await this.nimbu.get(`/channels/${ctx.fromChannel}`, options)
      ctx.fileFields = ctx.channel.customizations.filter(isFileField)
      ctx.galleryFields = ctx.channel.customizations.filter(isFieldOf(FieldType.GALLERY))
      ctx.selectFields = ctx.channel.customizations.filter(isFieldOf(FieldType.SELECT))
      ctx.multiSelectFields = ctx.channel.customizations.filter(isFieldOf(FieldType.MULTI_SELECT))
      ctx.referenceFields = ctx.channel.customizations.filter(isRelationalField)
      ctx.customerFields = ctx.referenceFields.filter((f) => f.reference === 'customers')
      ctx.selfReferences = ctx.referenceFields.filter((f) => f.reference === ctx.channel.slug)
    } catch (error) {
      if (error instanceof APIError) {
        if (error.body != null && error.body.code === 101) {
          throw new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
        } else {
          throw new Error(error.message)
        }
      } else {
        throw error
      }
    }
  }

  private async queryChannel(ctx: CopySingle, task: any) {
    let apiOptions: APIOptions = { site: ctx.fromSite, fetchAll: true }

    let baseUrl = `/channels/${ctx.fromChannel}/entries`
    let containedInParts: {
      [k: string]: string[]
    } = {}

    let queryParts: string[] = ['include_slugs=1', 'x-cdn-expires=600']
    let queryFromCtx: string | null = ctx.query != null && ctx.query.trim() != '' ? ctx.query.trim() : null
    let whereFromCtx: string | null = ctx.where != null && ctx.where.trim() != '' ? ctx.where.trim() : null

    if (queryFromCtx != null || whereFromCtx != null) {
      // if fromChannelOriginal is not set, we are just copying a single channel and not copying recursively
      // or if this is the first channel in the recursive chain, let's use the original query
      if (ctx.fromChannelOriginal == null || ctx.fromChannelOriginal === ctx.fromChannel) {
        if (queryFromCtx != null) {
          queryParts.push(queryFromCtx)
        } else if (whereFromCtx != null) {
          queryParts.push(`where=${encodeURIComponent(whereFromCtx)}`)
        }
      } else if (ctx.fromChannelOriginal != null && ctx.fromChannelOriginal !== ctx.fromChannel) {
        // in this case we have specified an original query and we want only to copy all dependant
        // channel entries with a link to this original query... this is a little more complicated

        // in the idsCache we already have a list of all previously copied items: if we have relational fields with
        // reference to a channel already present there, we limit the records we fetch for this channels to those matching
        // their id with these entries
        for (const field of ctx.referenceFields) {
          if (field.reference != 'customers' && this.idMapping[field.reference] != null) {
            const originalIds = Object.keys(this.idMapping[field.reference])
            if (originalIds.length > 0) {
              containedInParts[field.name] = originalIds
            }
          }
        }
      }
    }

    let perPageFromCtx: string | undefined = ctx.per_page
    let perPage = 30
    if (perPageFromCtx !== undefined && parseInt(perPageFromCtx, 10) > 0) {
      perPage = parseInt(perPageFromCtx, 10)
      queryParts.push(`per_page=${perPage}`)
    }

    let queries: string[] = []
    if (Object.keys(containedInParts).length > 0) {
      for (const [fieldName, ids] of Object.entries(containedInParts)) {
        // ensure the API url will not exceed 2000 characters
        // see: https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
        let objectIdBatchSize = 75 //(2000 - 200)/24
        let chunckedIds = chunk(ids, objectIdBatchSize)

        for (const chunk of chunckedIds) {
          const partialQueryParts = [
            ...queryParts,
            'where=' + encodeURIComponent(`${fieldName}.in:"${chunk.join(',')}"`),
          ]
          queries.push(`?${partialQueryParts.join('&')}`)
        }
      }
    } else {
      queries = [queryParts.length > 0 ? `?${queryParts.join('&')}` : '']
    }

    // first count the entries
    let counts = await Promise.all(
      queries.map(async (query) => {
        let url = `${baseUrl}/count${query}`

        this.debug(` -> fetching: ${url}`)
        let result = await this.nimbu.get<Nimbu.CountResult>(url, apiOptions)
        this.debug(` <- result: ${result.count}`)

        return result.count
      }),
    )
    ctx.nbEntries = sum(counts)

    // halt further execution if the first query does not result in any entries to copy
    if (
      ctx.nbEntries === 0 &&
      queryFromCtx != null &&
      (ctx.fromChannelOriginal == null || ctx.fromChannelOriginal === ctx.fromChannel)
    ) {
      ux.error('Please specify a query that returns entries to copy...')
    }

    let nbPages = 1
    if (ctx.nbEntries > 0) {
      nbPages = sum(counts.map((count) => Math.floor(count / perPage) + 1))
    }

    ctx.nbEntries = 0
    ctx.entries = []

    return new Observable((observer) => {
      apiOptions.onNextPage = (next, last) => {
        observer.next(`Fetching entries (page ${next} / ${last})`)
      }

      Promise.all(
        queries.map(async (query) => {
          let url = `${baseUrl}${query}`
          observer.next(`Fetching entries (page ${1} / ${nbPages})`)

          this.debug(` -> fetching: ${url}`)
          await this.nimbu
            .get<ChannelEntry[]>(url, apiOptions)
            .then((results) => {
              ctx.entries = ctx.entries.concat(results)
              ctx.nbEntries = ctx.nbEntries! + results.length

              for (const entry of results) {
                this.cacheId(ctx.fromChannel, entry.id)
              }

              return results
            })
            .then((results) => {
              this.debug(` <- result: ${results.length} entries`)
            })
            .catch((error) => {
              if (error.body != null && error.body.code === 101) {
                throw new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
              } else {
                throw new Error(error.message)
              }
            })
        }),
      ).then(() => {
        task.title = `Found ${ctx.nbEntries} entries in ${chalk.bold(ctx.fromChannel)}`
        observer.complete()
      })
    })
  }

  private async queryRelatedCustomers(ctx: CopySingle, task: any) {
    let fromOptions: APIOptions = { site: ctx.fromSite, fetchAll: true }
    let toOptions: APIOptions = { site: ctx.toSite, fetchAll: true }

    // collect owners
    let customerIds = uniq(compact(ctx.entries.map((entry) => entry._owner)))

    // collect ids for all fields referencing customers
    for (const field of ctx.customerFields) {
      let references: ChannelEntryReferenceSingle[]

      if (field.type === FieldType.BELONGS_TO_MANY) {
        let referencesMany = compact(ctx.entries.map((entry) => entry[field.name] as ChannelEntryReferenceMany))
        references = compact(flatten(referencesMany.map((relation) => relation.objects)))
      } else {
        references = compact(ctx.entries.map((entry) => entry[field.name] as ChannelEntryReferenceSingle))
      }

      customerIds = uniq(compact(customerIds.concat(references.map((ref) => ref.id))))
    }

    task.title = `Fetching ${customerIds.length} customers from ${chalk.bold(ctx.fromSite)}`

    // fetch customers from original site based on these ids
    const fromCustomers = await this.nimbu.get<Customer[]>(`/customers?id.in=${customerIds.join(',')}`, fromOptions)

    // fetch customers from target site based on emails for these customers
    const emails = fromCustomers.map((c) => c.email)
    const toCustomers = await this.nimbu.get<Customer[]>(`/customers?email.in=${emails.join(',')}`, toOptions)

    task.title = `Found ${customerIds.length} customers, mapping ${toCustomers.length} existing, creating ${
      customerIds.length - toCustomers.length
    } new...`

    for (const customer of fromCustomers) {
      const existingCustomer = toCustomers.find((c) => c.email === customer.email)

      if (existingCustomer != null) {
        this.cacheId('customers', customer.id, existingCustomer.id)
      } else {
        const randomPassword = new Array(32)
          .fill(null)
          .map(() => String.fromCharCode(Math.random() * 86 + 40))
          .join('')
        try {
          const newCustomer = await this.nimbu.post<Customer>('/customers', {
            site: ctx.toSite,
            body: {
              ...customer,
              skip_confirmation: true,
              skip_welcome: true,
              password: randomPassword,
              password_confirmation: randomPassword,
            },
          })
          this.cacheId('customers', customer.id, newCustomer.id)
        } catch (error) {
          if (error instanceof APIError) {
            const errorMessage = `creating customer #${customer.id} failed: ${error.body.message} => ${JSON.stringify(
              error.body.errors,
            )}`

            if (this.abortOnError) {
              ux.error(errorMessage)
            } else {
              this.warnings.push(errorMessage)
            }
          } else {
            throw error
          }
        }
      }
    }

    task.title = `Found ${customerIds.length} customers, mapped ${toCustomers.length} existing, created ${
      customerIds.length - toCustomers.length
    } new`
  }

  private async downloadAttachments(ctx: CopySingle) {
    return new Observable((observer) => {
      ;(async (observer, ctx) => {
        let i = 1
        ctx.files = {}

        this.debug(`Downloading attachments for ${ctx.entries.length} items`)
        for (let entry of ctx.entries) {
          for (let field of ctx.fileFields) {
            let fileObject = entry[field.name]
            if (fileObject != null) {
              this.debug(` -> field ${field.name} has a file`)
              let cacheKey = this.fileCacheKey(entry, field)
              await this.downloadFile(observer, i, ctx, fileObject, cacheKey, field.name)
            }
          }
          for (let field of ctx.galleryFields) {
            let galleryObject = entry[field.name]
            if (galleryObject != null && galleryObject.images != null) {
              for (let image of galleryObject.images) {
                let fileObject = image.file
                let cacheKey = this.galleryCacheKey(entry, field, image)
                await this.downloadFile(observer, i, ctx, fileObject, cacheKey, field.name)
              }
            }
          }
          i++
        }

        observer.complete()
      })(observer, ctx).catch((error) => {
        throw error
      })
    })
  }

  private async downloadFile(
    observer,
    i: number,
    ctx: CopySingle,
    fileObject: ChannelEntryFile,
    cacheKey: string,
    fieldName: string,
  ) {
    let tmp = require('tmp-promise')
    let prettyBytes = require('pretty-bytes')
    let pathFinder = require('path')

    if (fileObject != null && fileObject !== null && fileObject.url != null) {
      let url =
        fileObject.url.replace('http://', 'https://') + (fileObject.url.includes('?') ? '&' : '?') + generateRandom(6)
      const { path, cleanup } = await tmp.file({ prefix: `${fieldName}-` })
      let filename = pathFinder.basename(url)

      try {
        this.debug(` -> downloading ${url}`)
        await download(
          url,
          path,
          (bytes, percentage) => {
            observer.next(
              `[${i}/${ctx.nbEntries}] Downloading ${fieldName} => "${filename}" (${percentage}% of ${prettyBytes(
                bytes,
              )})`,
            )
          },
          this.debug,
        )
      } catch (error) {
        observer.error(error)
      }

      ctx.files[cacheKey] = { path, cleanup }
    }
  }

  private async createEntries(ctx: CopySingle) {
    return new Observable((observer) => {
      ;(async (observer, ctx) => {
        let i = 1
        let nbEntries = ctx.entries.length

        for (let original of ctx.entries) {
          let entry = cloneDeep(original)

          for (let field of ctx.fileFields) {
            let file = entry[field.name]
            if (file != null) {
              const key = this.fileCacheKey(entry, field)
              if (ctx.files[key] != null) {
                delete entry[field.name].url
                this.debug(` -> reading ${ctx.files[key].path}`)
                entry[field.name].attachment = await fs.readFile(ctx.files[key].path, { encoding: 'base64' })
              }
            }
          }

          for (let field of ctx.galleryFields) {
            let galleryObject = entry[field.name]
            if (galleryObject != null && galleryObject.images != null) {
              for (let image of galleryObject.images) {
                const key = this.galleryCacheKey(entry, field, image)
                delete image.id
                if (ctx.files[key] != null) {
                  delete image.file.url
                  image.file.attachment = await fs.readFile(ctx.files[key].path, { encoding: 'base64' })
                }
              }
            }
          }

          // flatten all select fields
          for (let field of ctx.selectFields) {
            if (entry[field.name] != null && entry[field.name].value != null) {
              entry[field.name] = entry[field.name].value
            }
          }

          for (let field of ctx.multiSelectFields) {
            if (entry[field.name] != null && entry[field.name].values != null) {
              entry[field.name] = entry[field.name].values
            }
          }

          // see if there are references we can replace with ids from newly created objects
          for (let field of ctx.referenceFields) {
            if (entry[field.name] != null) {
              if (field.type === FieldType.BELONGS_TO) {
                const reference = entry[field.name] as ChannelEntryReferenceSingle
                const newId = this.getCachedId(reference.className, reference.id)
                if (newId != null) {
                  entry[field.name].id = newId
                  delete entry[field.name].slug
                }
              } else {
                const relation = entry[field.name] as ChannelEntryReferenceMany

                entry[field.name].objects = relation.objects.map((reference) => {
                  const newId = this.getCachedId(reference.className, reference.id)
                  if (newId != null) {
                    reference.id = newId
                    delete reference.slug
                  }
                  return reference
                })
              }
            }
          }

          if (entry._owner != null) {
            const newId = this.getCachedId('customers', entry._owner)
            if (newId != null) {
              entry._owner = newId
            }
          }

          // remove self references first, as we'll try to update this in a second pass
          for (let field of ctx.selfReferences) {
            if (entry[field.name] != null) {
              delete entry[field.name]
            }
          }

          let options: APIOptions = {}
          if (ctx.toSite != null) {
            options.site = ctx.toSite
          }
          options.body = entry

          let existingId: string | undefined = undefined
          if (ctx.upsert != null) {
            const upsertParts = ctx.upsert.split(',')
            const globalUpserts = upsertParts.filter((u) => !u.includes(':'))
            const specificUpserts = upsertParts
              .filter((u) => u.includes(':') && u.split(':')[0] === ctx.toChannel)
              .map((u) => u.split(':')[1])

            if (globalUpserts.length > 0 || specificUpserts.length > 0) {
              try {
                const whereExpression = [...globalUpserts, ...specificUpserts]
                  .map((u) => `${u}:"${entry[u]}"`)
                  .join(' OR ')

                const url = `/channels/${ctx.toChannel}/entries?where=${encodeURIComponent(whereExpression)}`
                this.debug(url)
                let existing = await this.nimbu.get<ChannelEntry[]>(url, {
                  site: ctx.toSite,
                })

                if (existing.length > 0) {
                  existingId = existing[0].id
                }
              } catch (error) {}
            }
          }

          try {
            let createdOrUpdated: ChannelEntry
            if (existingId != null) {
              observer.next(
                `[${i}/${nbEntries}] updating entry #${existingId} "${chalk.bold(entry.title_field_value)}"`,
              )

              createdOrUpdated = await this.nimbu.put<ChannelEntry>(
                `/channels/${ctx.toChannel}/entries/${existingId}`,
                options,
              )
            } else {
              observer.next(`[${i}/${nbEntries}] creating entry "${chalk.bold(entry.title_field_value)}"`)

              createdOrUpdated = await this.nimbu.post<ChannelEntry>(`/channels/${ctx.toChannel}/entries`, options)
            }

            // store id in cache for dependant channels
            this.cacheId(ctx.toChannel, entry.id, createdOrUpdated.id)

            // store id for second pass in case of self-references
            original.id = createdOrUpdated.id
          } catch (error) {
            if (error instanceof APIError) {
              const errorMessage = `[${i}/${nbEntries}] creating entry ${ctx.toChannel}/#${entry.id} failed: ${
                error.body.message
              } => ${JSON.stringify(error.body.errors)}`

              if (this.abortOnError) {
                observer.error(new Error(errorMessage))
              } else {
                this.warnings.push(errorMessage)
              }
            } else {
              throw error
            }
          }

          i++
        }

        observer.complete()
      })(observer, ctx).catch((error) => {
        throw error
      })
    })
  }

  private async updateEntries(ctx: CopySingle) {
    return new Observable((observer) => {
      ;(async (observer, ctx) => {
        let i = 1
        let nbEntries = ctx.entries.length

        for (let entry of ctx.entries) {
          let data: any = {}
          let anySelfReferenceValues = false

          for (let field of ctx.selfReferences) {
            if (entry[field.name] != null) {
              anySelfReferenceValues = true
              data[field.name] = entry[field.name]
            }
          }

          if (anySelfReferenceValues) {
            observer.next(`[${i}/${nbEntries}] updating entry "${chalk.bold(entry.title_field_value)}" (#${entry.id})`)

            let options: any = {}
            if (ctx.toSite != null) {
              options.site = ctx.toSite
            }
            options.body = data

            try {
              await this.nimbu.patch(`/channels/${ctx.toChannel}/entries/${entry.id}`, options)
            } catch (error) {
              if (error instanceof APIError) {
                observer.error(
                  new Error(
                    `[${i}/${nbEntries}] updating entry #${entry.id} failed: ${error.body.message} => ${JSON.stringify(
                      error.body.errors,
                    )}`,
                  ),
                )
              } else {
                throw error
              }
            }
          }

          i++
        }

        observer.complete()
      })(observer, ctx).catch((error) => {
        throw error
      })
    })
  }

  private fileCacheKey(entry: ChannelEntry, field: CustomField) {
    return `${entry.id}-${field.name}`
  }

  private galleryCacheKey(entry: ChannelEntry, field: CustomField, image: any) {
    return `${entry.id}-${field.name}-${image.id}`
  }

  private cacheId(slug: string, sourceId: string, targetId?: string) {
    if (this.idMapping[slug] == null) {
      this.idMapping[slug] = {}
    }

    this.idMapping[slug][sourceId] = targetId ?? null
  }

  private getCachedId(slug: string, sourceId: string) {
    if (this.idMapping[slug] == null) {
      return null
    } else {
      return this.idMapping[slug][sourceId]
    }
  }

  private printWarnings() {
    if (this.warnings.length > 0) {
      ux.warn('Some entries could not be created due to validation errors:')
      for (const message of this.warnings) {
        ux.warn(message)
      }
    }
  }
}
