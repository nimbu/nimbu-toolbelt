import { APIError, APIOptions, Command, APITypes as Nimbu, color } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import { chunk, cloneDeep, sum } from 'lodash'
import { Observable } from 'rxjs'

import {
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
} from '../../nimbu/types'
import { download, generateRandom } from '../../utils/files'

type CopySingle = {
  customerFields: RelationalField[]
  entries: Customer[]
  fileFields: FileField[]
  files: {
    [k: string]: { cleanup: any; path: string }
  }
  fromSite: string
  galleryFields: RegularField[]
  multiSelectFields: SelectField[]
  nbEntries?: number
  passwordLength: number
  per_page?: string
  query?: string
  referenceFields: RelationalField[]
  selectFields: SelectField[]
  selfReferences: RelationalField[]
  toSite: string
  upsert?: string
  where?: string
}

function generatePassword(length = 8) {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_-+='

  let password = ''
  for (let i = 0; i < length; i++) {
    password += characters.charAt(Math.floor(Math.random() * characters.length))
  }

  return password
}

export default class CopyCustomers extends Command {
  static description = 'copy customers from one to another'

  static flags = {
    'allow-errors': Flags.boolean({
      description: 'do not stop when an item fails and continue with the other',
    }),
    from: Flags.string({
      char: 'f',
      description: 'the source site',
      required: true,
    }),
    'password-length': Flags.integer({
      char: 'l',
      default: 12,
      description: 'length of the password generated for each new customer',
    }),
    'per-page': Flags.string({
      char: 'p',
      description: 'number of customers to fetch per page',
    }),
    query: Flags.string({
      char: 'q',
      description: 'query params to append to source customer api call',
    }),
    to: Flags.string({
      char: 't',
      description: 'the target site',
      required: true,
    }),
    upsert: Flags.string({
      char: 'u',
      default: 'email',
      description: 'name of parameter to use for matching existing customers',
    }),
    where: Flags.string({
      char: 'w',
      description: 'query expression to filter the the source customer api call',
    }),
  }

  private abortOnError = true

  private createdCustomers: Customer[] = []
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
    const { flags } = await this.parse(CopyCustomers)

    if (process.env.DEBUG != null) {
      process.stdout.isTTY = false
    }

    if (flags['allow-errors']) {
      this.abortOnError = false
    }

    await this.executeCopy()
  }

  async executeCopy() {
    const Listr = require('listr')
    const { flags } = await this.parse(CopyCustomers)

    const { fromSite, toSite } = await this.getFromTo()

    const tasks = new Listr([
      {
        task: (ctx: CopySingle) => this.fetchCustomerInfo(ctx),
        title: `Fetching customer fields from site ${chalk.bold(fromSite)}`,
      },
      {
        task: (ctx: CopySingle, task) => this.queryCustomers(ctx, task),
        title: `Querying customers`,
      },
      {
        enabled: (ctx: CopySingle) =>
          (ctx.fileFields && ctx.fileFields.length > 0) || (ctx.galleryFields && ctx.galleryFields.length > 0),
        task: (ctx: CopySingle) => this.downloadAttachments(ctx),
        title: `Downloading attachments`,
      },
      {
        skip: (ctx: CopySingle) => ctx.entries.length === 0,
        task: (ctx: CopySingle) => this.createCustomers(ctx),
        title: `Upserting customers in site ${chalk.bold(toSite)}`,
      },
      {
        enabled: (ctx: CopySingle) => ctx.selfReferences && ctx.selfReferences.length > 0,
        task: (ctx: CopySingle) => this.updateCustomers(ctx),
        title: `Updating self-references for new entries in site ${chalk.bold(toSite)}`,
      },
    ])

    await tasks
      .run({
        createdEntries: [],
        fromSite,
        passwordLength: flags['password-length'],
        per_page: flags['per-page'],
        query: flags.query,
        toSite,
        upsert: flags.upsert,
        where: flags.where,
      })
      .catch((error) => this.error(error))

    this.printWarnings()
    this.printCreatedCustomers(toSite)
  }

  private cacheId(slug: string, sourceId: string, targetId?: string) {
    if (this.idMapping[slug] == null) {
      this.idMapping[slug] = {}
    }

    this.idMapping[slug][sourceId] = targetId ?? null
  }

  private async createCustomers(ctx: CopySingle) {
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

          // set fields so user is activated
          entry.skip_welcome = true
          entry.skip_confirmation = true
          entry.password = generatePassword(ctx.passwordLength)
          entry.password_confirmation = entry.password

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
              .filter((u) => u.includes(':') && u.split(':')[0] === 'customers')
              .map((u) => u.split(':')[1])

            if (globalUpserts.length === 0 || specificUpserts.length === 0) {
              globalUpserts.push('email')
            }

            if (globalUpserts.length > 0 || specificUpserts.length > 0) {
              try {
                const whereExpression = [...globalUpserts, ...specificUpserts]
                  .map((u) => {
                    const key = u === 'slug' ? '_slug' : u
                    const value = entry[u]

                    return `${key}:"${value}"`
                  })
                  .join(' OR ')

                const url = `/customers?where=${encodeURIComponent(whereExpression)}`
                this.debug(url)
                const existing = await this.nimbu.get<Customer[]>(url, {
                  site: ctx.toSite,
                })

                if (existing.length > 0) {
                  existingId = existing[0].id
                }
              } catch {}
            }
          }

          try {
            let createdOrUpdated: Customer
            if (existingId == null) {
              observer.next(`[${i}/${nbEntries}] creating entry "${chalk.bold(entry.email)}"`)

              createdOrUpdated = await this.nimbu.post<Customer>(`/customers`, options)

              // remember the newly created customer with password to print later
              createdOrUpdated.password = entry.password
              this.createdCustomers.push(createdOrUpdated)
            } else {
              observer.next(`[${i}/${nbEntries}] updating entry #${existingId} "${chalk.bold(entry.email)}"`)

              createdOrUpdated = await this.nimbu.put<Customer>(`/customers/${existingId}`, options)
            }

            // store id in cache for dependant channels
            this.cacheId('customers', entry.id, createdOrUpdated.id)

            // store id for second pass in case of self-references
            original.id = createdOrUpdated.id
          } catch (error) {
            if (error instanceof APIError) {
              const errorMessage = `[${i}/${nbEntries}] creating customer #${entry.id} failed: ${
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

  private async fetchCustomerInfo(ctx: CopySingle) {
    const options: APIOptions = { site: ctx.fromSite }

    try {
      const customizations = await this.nimbu.get<CustomField[]>(`/customers/customizations`, options)

      ctx.fileFields = customizations.filter(isFileField)
      ctx.galleryFields = customizations.filter(isFieldOf(FieldType.GALLERY))
      ctx.selectFields = customizations.filter(isFieldOf(FieldType.SELECT))
      ctx.multiSelectFields = customizations.filter(isFieldOf(FieldType.MULTI_SELECT))
      ctx.referenceFields = customizations.filter(isRelationalField)
      ctx.selfReferences = ctx.referenceFields.filter((f) => f.reference === 'customers')
    } catch (error) {
      const error_ = error instanceof APIError ? new Error(error.message) : error
      throw error_
    }
  }

  private fileCacheKey(entry: Customer, field: CustomField) {
    return `${entry.id}-${field.name}`
  }

  private galleryCacheKey(entry: Customer, field: CustomField, image: any) {
    return `${entry.id}-${field.name}-${image.id}`
  }

  private getCachedId(slug: string, sourceId: string) {
    if (this.idMapping[slug] == null) {
      return null
    }

    return this.idMapping[slug][sourceId]
  }

  private async getFromTo() {
    const { flags } = await this.parse(CopyCustomers)

    const fromSite = flags.from ?? this.nimbuConfig.site
    const toSite = flags.to ?? this.nimbuConfig.site

    if (fromSite === undefined) {
      ux.error('You need to specify the source site.')
      throw new Error('You need to specify the source site.')
    }

    if (toSite === undefined) {
      ux.error('You need to specify the destination site.')
      throw new Error('You need to specify the destination site.')
    }

    if (fromSite === toSite) {
      ux.error('You can not copy to the same site.')
    }

    return { fromSite, toSite }
  }

  private printCreatedCustomers(toSite: string) {
    if (this.createdCustomers.length > 0) {
      const supports = require('supports-hyperlinks')
      const hyperlinker = require('hyperlinker')

      const columns: ux.Table.table.Columns<Customer> = {
        email: {
          get: (row) => row.email,
          header: 'Email',
        },
        name: {
          get: (row) => `${row.firstname} ${row.lastname}`,
          header: 'Name',
        },
        password: {
          get: (row) => row.password,
          header: 'Password',
        },
        url: {
          get(row) {
            const url = `https://${toSite}.nimbu.io/admin/customers/${row.id}`
            if (supports.stdout) {
              return hyperlinker(color.dim(url), url)
            }

            return color.dim(url)
          },
          header: 'Link',
        },
      }

      ux.info('\n✨ Following cusomers were created ✨\n')
      ux.table(this.createdCustomers, columns)
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

  private async queryCustomers(ctx: CopySingle, task: any) {
    const apiOptions: APIOptions = { fetchAll: true, site: ctx.fromSite }

    const baseUrl = `/customers`
    const containedInParts: {
      [k: string]: string[]
    } = {}

    const queryParts: string[] = ['include_slugs=1', 'x-cdn-expires=600', 'resolve=roles']
    const queryFromCtx: null | string = ctx.query != null && ctx.query.trim() !== '' ? ctx.query.trim() : null
    const whereFromCtx: null | string = ctx.where != null && ctx.where.trim() !== '' ? ctx.where.trim() : null

    if (queryFromCtx != null || whereFromCtx != null) {
      // if fromChannelOriginal is not set, we are just copying a single channel and not copying recursively
      // or if this is the first channel in the recursive chain, let's use the original query
      if (queryFromCtx != null) {
        queryParts.push(queryFromCtx)
      } else if (whereFromCtx != null) {
        queryParts.push(`where=${encodeURIComponent(whereFromCtx)}`)
      }
    }

    const perPageFromCtx: string | undefined = ctx.per_page
    let perPage = 30
    if (perPageFromCtx !== undefined && Number.parseInt(perPageFromCtx, 10) > 0) {
      perPage = Number.parseInt(perPageFromCtx, 10)
      queryParts.push(`per_page=${perPage}`)
    }

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
    if (ctx.nbEntries === 0 && queryFromCtx != null) {
      ux.error('Please specify a query that returns customers to copy...')
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
            .get<Customer[]>(url, apiOptions)
            .then((results) => {
              ctx.entries = [...ctx.entries, ...results]
              ctx.nbEntries = (ctx.nbEntries ?? 0) + results.length

              for (const entry of results) {
                this.debug(` <- got: ${JSON.stringify(entry, null, 2)}`)
                this.cacheId('customers', entry.id)
              }

              return results
            })
            .then((results) => {
              this.debug(` <- result: ${results.length} entries`)
            })
            .catch((error) => {
              throw new Error(error.message)
            })
        }),
      ).then(() => {
        task.title = `Found ${ctx.nbEntries} customers in ${chalk.bold(ctx.fromSite)}`
        observer.complete()
      })
    })
  }

  private async updateCustomers(ctx: CopySingle) {
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
            observer.next(`[${i}/${nbEntries}] updating entry "${chalk.bold(entry.email)}" (#${entry.id})`)

            const options: any = {}
            if (ctx.toSite != null) {
              options.site = ctx.toSite
            }

            options.body = data

            try {
              await this.nimbu.patch(`/customers/${entry.id}`, options)
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
