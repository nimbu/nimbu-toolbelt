import { APIError, APIOptions, Command, APITypes as Nimbu } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import { chunk, cloneDeep, compact, flatten, intersection, sum, uniq } from 'lodash'
import { Observable } from 'rxjs'

import {
  Channel,
  ChannelEntry,
  ChannelEntryFile,
  ChannelEntryReferenceMany,
  ChannelEntryReferenceSingle,
  CustomField,
  Customer,
  FieldType,
  FileField,
  RegularField,
  RelationalField,
  SelectField,
  isFieldOf,
  isFileField,
  isRelationalField,
} from '../../../nimbu/types'
import { fetchAllChannels } from '../../../utils/channels'
import { download, generateRandom } from '../../../utils/files'

type CopySingle = {
  channel: Channel
  customerFields: RelationalField[]
  dryRun?: boolean
  entries: ChannelEntry[]
  fileFields: FileField[]
  files: {
    [k: string]: { cleanup: any; path: string }
  }
  fromChannel: string
  fromChannelOriginal?: string
  fromSite: string
  galleryFields: RegularField[]
  multiSelectFields: SelectField[]
  nbEntries?: number
  per_page?: string
  query?: string
  referenceFields: RelationalField[]
  selectFields: SelectField[]
  selfReferences: RelationalField[]
  toChannel: string
  toSite: string
  upsert?: string
  where?: string
}

type CopySingleRecursive = {
  channels: Channel[]
  fromChannel: string
  fromSite: string
  only?: string
  per_page?: string
  query?: string
  toChannel: string
  toSite: string
  upsert?: string
  where?: string
}

export default class CopyChannelEntries extends Command {
  static description = 'copy channel entries from one to another'

  static flags = {
    'allow-errors': Flags.boolean({
      description: 'do not stop when an item fails and continue with the other',
    }),
    'copy-customers': Flags.boolean({
      description: 'copy and replicate all owners related to the objects we are copying',
    }),
    'dry-run': Flags.boolean({
      description: 'log which translations would be copied without actually copying them',
    }),
    from: Flags.string({
      char: 'f',
      description: 'slug of the source channel',
      required: true,
    }),
    only: Flags.string({
      description: 'limit copy of channels to this list (comma-separated)',
    }),
    'per-page': Flags.string({
      char: 'p',
      description: 'number of entries to fetch per page',
    }),
    query: Flags.string({
      char: 'q',
      description: 'query params to append to source channel api call',
    }),
    recursive: Flags.boolean({
      char: 'r',
      description: 'automatically copy all dependent objects',
    }),
    to: Flags.string({
      char: 't',
      description: 'slug of the target channel',
      required: true,
    }),
    upsert: Flags.string({
      char: 'u',
      description: 'name of parameter to use for matching existing documents',
    }),
    where: Flags.string({
      char: 'w',
      description: 'query expression to filter the source channel',
    }),
  }

  private abortOnError = true

  // mapping of ids in source site to newly created items in target site
  private idMapping: {
    [channelSlug: string]: {
      [id: string]: null | string
    }
  } = {}

  private warnings: string[] = []

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    const { flags } = await this.parse(CopyChannelEntries)

    if (process.env.DEBUG != null) {
      process.stdout.isTTY = false
    }

    if (flags['allow-errors']) {
      this.abortOnError = false
    }

    await (flags.recursive ? this.executeRecursiveCopy() : this.executeSingleCopy())
  }

  async executeRecursiveCopy() {
    const Listr = require('listr')
    const ListrMultilineRenderer = require('listr-multiline-renderer')
    const { flags } = await this.parse(CopyChannelEntries)

    const { fromChannel, fromSite, toChannel, toSite } = await this.getFromTo()

    const tasks = new Listr(
      [
        {
          task: (ctx: CopySingleRecursive) => this.fetchAllChannels(ctx),
          title: `Fetching related channel config for ${chalk.bold(fromChannel)} from site ${chalk.bold(fromSite)}`,
        },
        {
          enabled: (ctx: CopySingleRecursive) => ctx.query != null || ctx.where != null,
          task: (ctx: CopySingle, task) => this.queryChannel(ctx, task),
          title: `Fetching which entries to copy from ${chalk.bold(fromChannel)}`,
        },
        {
          enabled: (ctx: CopySingleRecursive) => ctx.channels != null && ctx.channels.length > 0,
          task: (ctx: CopySingleRecursive, _task) =>
            new Listr(
              ctx.channels.map((channel) => ({
                task: (ctx, _task) => {
                  ctx.fromChannel = channel.slug
                  ctx.toChannel = channel.slug

                  return new Listr(
                    [
                      {
                        task: (ctx: CopySingle) => this.fetchChannel(ctx),
                        title: `Fetching detailed channel information for ${chalk.bold(channel.slug)}`,
                      },
                      {
                        task: (ctx: CopySingle, task) => this.queryChannel(ctx, task),
                        title: `Querying channel entries`,
                      },
                      {
                        enabled: () => flags['copy-customers'],
                        skip: (ctx) => ctx.entries == null || ctx.entries.length === 0,
                        task: (ctx: CopySingle, task) => this.queryRelatedCustomers(ctx, task),
                        title: `Querying related customers for fetched entries`,
                      },
                      {
                        enabled: (ctx: CopySingle) =>
                          (ctx.fileFields && ctx.fileFields.length > 0) ||
                          (ctx.galleryFields && ctx.galleryFields.length > 0),
                        task: (ctx: CopySingle) => this.downloadAttachments(ctx),
                        title: `Downloading attachments`,
                      },
                      {
                        skip: (ctx: CopySingle) => {
                          if (ctx.entries.length === 0) return true
                          if (ctx.dryRun) return this.generateDryRun(ctx)
                        },
                        task: (ctx: CopySingle) => this.createEntries(ctx),
                        title: `Creating entries in site ${chalk.bold(toSite)}`,
                      },
                      {
                        enabled: (ctx: CopySingle) => ctx.selfReferences && ctx.selfReferences.length > 0,
                        skip: (ctx) => ctx.dryRun,
                        task: (ctx: CopySingle) => this.updateEntries(ctx),
                        title: `Updating self-references`,
                      },
                    ],
                    { collapse: false, renderer: ListrMultilineRenderer },
                  )
                },
                title: `Copying ${chalk.bold(channel.name)} (${channel.slug})`,
              })),
              { collapse: false, renderer: ListrMultilineRenderer },
            ),
          title: `Copying related channel entries to site ${chalk.bold(toSite)}`,
        },
      ],
      { collapse: false, renderer: ListrMultilineRenderer },
    )

    await tasks
      .run({
        dryRun: flags['dry-run'],
        fromChannel,
        fromChannelOriginal: fromChannel,
        fromSite,
        only: flags.only,
        per_page: flags['per-page'],
        query: flags.query,
        toChannel,
        toSite,
        upsert: flags.upsert,
        where: flags.where,
      })
      .catch((error) => this.error(error))

    this.printWarnings()
  }

  async executeSingleCopy(channel?: string) {
    const Listr = require('listr')
    const ListrMultilineRenderer = require('listr-multiline-renderer')
    const { flags } = await this.parse(CopyChannelEntries)

    const { fromChannel, fromSite, toChannel, toSite } = await this.getFromTo()

    const tasks = new Listr(
      [
        {
          task: (ctx: CopySingle) => this.fetchChannel(ctx),
          title: `Fetching channel information ${chalk.bold(channel || fromChannel)} from site ${chalk.bold(fromSite)}`,
        },
        {
          task: (ctx: CopySingle, task) => this.queryChannel(ctx, task),
          title: `Querying entries from channel ${chalk.bold(channel || fromChannel)}`,
        },
        {
          enabled: (ctx: CopySingle) =>
            (ctx.fileFields && ctx.fileFields.length > 0) || (ctx.galleryFields && ctx.galleryFields.length > 0),
          task: (ctx: CopySingle) => this.downloadAttachments(ctx),
          title: `Downloading attachments from channel ${chalk.bold(channel || fromChannel)}`,
        },
        {
          skip: (ctx) => {
            if (ctx.entries.length === 0) return true
            if (ctx.dryRun) return this.generateDryRun(ctx)
          },
          task: (ctx: CopySingle) => this.createEntries(ctx),
          title: `Creating entries in channel ${chalk.bold(toChannel)} for site ${chalk.bold(toSite)}`,
        },
        {
          enabled: (ctx: CopySingle) => ctx.selfReferences && ctx.selfReferences.length > 0,
          skip: (ctx) => ctx.dryRun,
          task: (ctx: CopySingle) => this.updateEntries(ctx),
          title: `Updating self-references for new entries in channel ${chalk.bold(toChannel)}`,
        },
      ],
      { renderer: ListrMultilineRenderer },
    )

    await tasks
      .run({
        dryRun: flags['dry-run'],
        fromChannel: channel || fromChannel,
        fromSite,
        per_page: flags['per-page'],
        query: flags.query,
        toChannel: channel || toChannel,
        toSite,
        upsert: flags.upsert,
        where: flags.where,
      })
      .catch((error) => this.error(error))

    this.printWarnings()
  }

  private cacheId(slug: string, sourceId: string, targetId?: string) {
    if (this.idMapping[slug] == null) {
      this.idMapping[slug] = {}
    }

    this.idMapping[slug][sourceId] = targetId ?? null
  }

  private async createEntries(ctx: CopySingle) {
    return new Observable((observer) => {
      ;(async (observer, ctx) => {
        let i = 1
        const nbEntries = ctx.entries.length

        for (const original of ctx.entries) {
          const entry = cloneDeep(original)

          for (const field of ctx.fileFields) {
            const file = entry[field.name]
            if (file != null) {
              const key = this.fileCacheKey(entry, field)
              if (ctx.files[key] != null) {
                delete entry[field.name].url
                this.debug(` -> reading ${ctx.files[key].path}`)
                entry[field.name].attachment = await fs.readFile(ctx.files[key].path, { encoding: 'base64' })
              }
            }
          }

          for (const field of ctx.galleryFields) {
            const galleryObject = entry[field.name]
            if (galleryObject != null && galleryObject.images != null) {
              for (const image of galleryObject.images) {
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
          for (const field of ctx.selectFields) {
            if (entry[field.name] != null && entry[field.name].value != null) {
              entry[field.name] = entry[field.name].value
            }
          }

          for (const field of ctx.multiSelectFields) {
            if (entry[field.name] != null && entry[field.name].values != null) {
              entry[field.name] = entry[field.name].values
            }
          }

          // see if there are references we can replace with ids from newly created objects
          for (const field of ctx.referenceFields) {
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
          for (const field of ctx.selfReferences) {
            if (entry[field.name] != null) {
              delete entry[field.name]
            }
          }

          const options: APIOptions = {}
          if (ctx.toSite != null) {
            options.site = ctx.toSite
          }

          options.body = entry

          let existingId: string | undefined
          if (ctx.upsert != null) {
            const upsertParts = ctx.upsert.split(',')
            const globalUpserts = upsertParts.filter((u) => !u.includes(':'))
            const specificUpserts = upsertParts
              .filter((u) => u.includes(':') && u.split(':')[0] === ctx.toChannel)
              .map((u) => u.split(':')[1])

            if (globalUpserts.length > 0 || specificUpserts.length > 0) {
              try {
                const whereExpression = [...globalUpserts, ...specificUpserts]
                  .map((u) => {
                    const key = u === 'slug' ? '_slug' : u
                    const value = entry[u]

                    return `${key}:"${value}"`
                  })
                  .join(' OR ')

                const url = `/channels/${ctx.toChannel}/entries?where=${encodeURIComponent(whereExpression)}`
                this.debug(url)
                const existing = await this.nimbu.get<ChannelEntry[]>(url, {
                  site: ctx.toSite,
                })

                if (existing.length > 0) {
                  existingId = existing[0].id
                }
              } catch {}
            }
          }

          try {
            let createdOrUpdated: ChannelEntry
            if (existingId == null) {
              observer.next(`[${i}/${nbEntries}] creating entry "${chalk.bold(entry.title_field_value)}"`)

              createdOrUpdated = await this.nimbu.post<ChannelEntry>(`/channels/${ctx.toChannel}/entries`, options)
            } else {
              observer.next(
                `[${i}/${nbEntries}] updating entry #${existingId} "${chalk.bold(entry.title_field_value)}"`,
              )

              createdOrUpdated = await this.nimbu.put<ChannelEntry>(
                `/channels/${ctx.toChannel}/entries/${existingId}`,
                options,
              )
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

  private async downloadAttachments(ctx: CopySingle) {
    return new Observable((observer) => {
      ;(async (observer, ctx) => {
        let i = 1
        ctx.files = {}

        this.debug(`Downloading attachments for ${ctx.entries.length} items`)
        for (const entry of ctx.entries) {
          for (const field of ctx.fileFields) {
            const fileObject = entry[field.name]
            if (fileObject != null) {
              this.debug(` -> field ${field.name} has a file`)
              const cacheKey = this.fileCacheKey(entry, field)
              await this.downloadFile(observer, i, ctx, fileObject, cacheKey, field.name)
            }
          }

          for (const field of ctx.galleryFields) {
            const galleryObject = entry[field.name]
            if (galleryObject != null && galleryObject.images != null) {
              for (const image of galleryObject.images) {
                const fileObject = image.file
                const cacheKey = this.galleryCacheKey(entry, field, image)
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

  // eslint-disable-next-line max-params
  private async downloadFile(
    observer,
    i: number,
    ctx: CopySingle,
    fileObject: ChannelEntryFile,
    cacheKey: string,
    fieldName: string,
  ) {
    const tmp = require('tmp-promise')
    const prettyBytes = require('pretty-bytes')
    const pathFinder = require('node:path')

    if (fileObject != null && fileObject !== null && fileObject.url != null) {
      const url =
        fileObject.url.replace('http://', 'https://') + (fileObject.url.includes('?') ? '&' : '?') + generateRandom(6)
      const { cleanup, path } = await tmp.file({ prefix: `${fieldName}-` })
      const filename = pathFinder.basename(url)

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

      ctx.files[cacheKey] = { cleanup, path }
    }
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

    // ensure the original channel to copy is included
    if (!channelsWithReferences.some((c) => c.slug === ctx.fromChannel)) {
      const channel = channels.find((c) => c.slug === ctx.fromChannel)
      if (channel != null) {
        channelsWithReferences.unshift(channel)
      }
    }

    ctx.channels = channelsWithReferences
  }

  private async fetchChannel(ctx: CopySingle) {
    const options: APIOptions = { site: ctx.fromSite }

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
        const error_ =
          error.body != null && error.body.code === 101
            ? new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
            : new Error(error.message)
        throw error_
      } else {
        throw error
      }
    }
  }

  private fileCacheKey(entry: ChannelEntry, field: CustomField) {
    return `${entry.id}-${field.name}`
  }

  private galleryCacheKey(entry: ChannelEntry, field: CustomField, image: any) {
    return `${entry.id}-${field.name}-${image.id}`
  }

  private generateDryRun(ctx?: any) {
    const nbEntries = ctx.entries.length
    const dryRunLogs: string[] = []
    let crntIndex = 1
    for (const entry of ctx.entries) {
      dryRunLogs.push(
        `[${crntIndex}/${nbEntries}] Dry-run: would copy entry ${chalk.bold(entry.title_field_value)} (${
          entry.id
        }) to ${chalk.bold(ctx.toSite)}`,
      )
      crntIndex++
    }

    return dryRunLogs.join('\n')
  }

  private getCachedId(slug: string, sourceId: string) {
    if (this.idMapping[slug] == null) {
      return null
    }

    return this.idMapping[slug][sourceId]
  }

  private async getFromTo() {
    const { flags } = await this.parse(CopyChannelEntries)

    let fromChannel: string
    let toChannel: string
    let fromSite: string | undefined
    let toSite: string | undefined

    const fromParts = flags.from.split('/')
    if (fromParts.length > 1) {
      fromSite = fromParts[0]
      fromChannel = fromParts[1]
    } else {
      fromSite = this.nimbuConfig.site
      fromChannel = fromParts[0]
    }

    const toParts = flags.to.split('/')
    if (toParts.length > 1) {
      toSite = toParts[0]
      toChannel = toParts[1]
    } else {
      toSite = this.nimbuConfig.site
      toChannel = toParts[0]
    }

    if (fromSite === undefined) {
      ux.error('You need to specify the source site.')
      throw new Error('You need to specify the source site.')
    }

    if (toSite === undefined) {
      ux.error('You need to specify the destination site.')
      throw new Error('You need to specify the destination site.')
    }

    return { fromChannel, fromSite, toChannel, toSite }
  }

  private printWarnings() {
    if (this.warnings.length > 0) {
      ux.warn('Some entries could not be created due to validation errors:')
      for (const message of this.warnings) {
        ux.warn(message)
      }
    }
  }

  private async queryChannel(ctx: CopySingle, task: any) {
    const apiOptions: APIOptions = { fetchAll: true, site: ctx.fromSite }

    const baseUrl = `/channels/${ctx.fromChannel}/entries`
    const containedInParts: {
      [k: string]: string[]
    } = {}

    const queryParts: string[] = ['include_slugs=1', 'x-cdn-expires=600']
    const queryFromCtx: null | string = ctx.query != null && ctx.query.trim() !== '' ? ctx.query.trim() : null
    const whereFromCtx: null | string = ctx.where != null && ctx.where.trim() !== '' ? ctx.where.trim() : null

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
          if (field.reference !== 'customers' && this.idMapping[field.reference] != null) {
            const originalIds = Object.keys(this.idMapping[field.reference])
            if (originalIds.length > 0) {
              containedInParts[field.name] = originalIds
            }
          }
        }
      }
    }

    const perPageFromCtx: string | undefined = ctx.per_page
    let perPage = 30
    if (perPageFromCtx !== undefined && Number.parseInt(perPageFromCtx, 10) > 0) {
      perPage = Number.parseInt(perPageFromCtx, 10)
    }

    queryParts.push(`per_page=${perPage}`)

    let queries: string[] = []
    if (Object.keys(containedInParts).length > 0) {
      for (const [fieldName, ids] of Object.entries(containedInParts)) {
        // ensure the API url will not exceed 2000 characters
        // see: https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
        const objectIdBatchSize = 75 // (2000 - 200)/24
        const chunckedIds = chunk(ids, objectIdBatchSize)

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
    const counts = await Promise.all(
      queries.map(async (query) => {
        const url = `${baseUrl}/count${query}`

        this.debug(` -> fetching: ${url}`)
        const result = await this.nimbu.get<Nimbu.CountResult>(url, apiOptions)
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
          const url = `${baseUrl}${query}`
          observer.next(`Fetching entries (page ${1} / ${nbPages})`)

          this.debug(` -> fetching: ${url}`)
          await this.nimbu
            .get<ChannelEntry[]>(url, apiOptions)
            .then((results) => {
              ctx.entries = [...ctx.entries, ...results]
              ctx.nbEntries = (ctx.nbEntries ?? 0) + results.length

              for (const entry of results) {
                this.cacheId(ctx.fromChannel, entry.id)
              }

              return results
            })
            .then((results) => {
              this.debug(` <- result: ${results.length} entries`)
            })
            .catch((error) => {
              const error_ =
                error.body != null && error.body.code === 101
                  ? new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
                  : new Error(error.message)
              throw error_
            })
        }),
      ).then(() => {
        task.title = `Found ${ctx.nbEntries} entries in ${chalk.bold(ctx.fromChannel)}`
        observer.complete()
      })
    })
  }

  private async queryRelatedCustomers(ctx: CopySingle, task: any) {
    const fromOptions: APIOptions = { fetchAll: true, site: ctx.fromSite }
    const toOptions: APIOptions = { fetchAll: true, site: ctx.toSite }

    // collect owners
    let customerIds = uniq(compact(ctx.entries.map((entry) => entry._owner)))

    // collect ids for all fields referencing customers
    for (const field of ctx.customerFields) {
      let references: ChannelEntryReferenceSingle[]

      if (field.type === FieldType.BELONGS_TO_MANY) {
        const referencesMany = compact(ctx.entries.map((entry) => entry[field.name] as ChannelEntryReferenceMany))
        references = compact(flatten(referencesMany.map((relation) => relation.objects)))
      } else {
        references = compact(ctx.entries.map((entry) => entry[field.name] as ChannelEntryReferenceSingle))
      }

      customerIds = uniq(compact([...customerIds, ...references.map((ref) => ref.id)]))
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

      if (existingCustomer == null) {
        const randomPassword = Array.from({ length: 32 })
          .fill(null)
          .map(() => String.fromCodePoint(Math.random() * 86 + 40))
          .join('')
        try {
          const newCustomer = await this.nimbu.post<Customer>('/customers', {
            body: {
              ...customer,
              password: randomPassword,
              password_confirmation: randomPassword,
              skip_confirmation: true,
              skip_welcome: true,
            },
            site: ctx.toSite,
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
      } else {
        this.cacheId('customers', customer.id, existingCustomer.id)
      }
    }

    task.title = `Found ${customerIds.length} customers, mapped ${toCustomers.length} existing, created ${
      customerIds.length - toCustomers.length
    } new`
  }

  private async updateEntries(ctx: CopySingle) {
    return new Observable((observer) => {
      ;(async (observer, ctx) => {
        let i = 1
        const nbEntries = ctx.entries.length

        for (const entry of ctx.entries) {
          const data: any = {}
          let anySelfReferenceValues = false

          for (const field of ctx.selfReferences) {
            if (entry[field.name] != null) {
              anySelfReferenceValues = true
              data[field.name] = entry[field.name]
            }
          }

          if (anySelfReferenceValues) {
            observer.next(`[${i}/${nbEntries}] updating entry "${chalk.bold(entry.title_field_value)}" (#${entry.id})`)

            const options: any = {}
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
}
