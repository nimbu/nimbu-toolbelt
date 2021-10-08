import Command, { APITypes as Nimbu, HTTPError } from '@nimbu-cli/command'
import { download, generateRandom } from '../../../utils/files'

import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import fs from 'fs-extra'
import clonedeep from 'lodash.clonedeep'

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
      description: 'query params to apply to source channel',
    }),
    upsert: flags.string({
      char: 'u',
      description: 'name of parameter to use for matching existing documents',
    }),
    per_page: flags.string({
      char: 'p',
      description: 'number of entries to fetch per page',
    }),
  }

  async execute() {
    const Listr = require('listr')
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
      return
    }

    if (toSite === undefined) {
      ux.error('You need to specify the destination site.')
      return
    }

    let fetchTitle = `Fetching channel information ${chalk.bold(fromChannel)} from site ${chalk.bold(fromSite)}`
    let queryTitle = `Querying entries from channel ${chalk.bold(fromChannel)}`
    let downloadTitle = `Downloading attachments from channel ${chalk.bold(fromChannel)}`
    let createTitle = `Creating entries in channel ${chalk.bold(toChannel)} for site ${chalk.bold(toSite)}`
    let updateTitle = `Updating self-references for new entries in channel ${chalk.bold(toChannel)}`

    const tasks = new Listr([
      {
        title: fetchTitle,
        task: (ctx) => this.fetchChannel(ctx),
      },
      {
        title: queryTitle,
        task: (ctx, task) => this.queryChannel(ctx, task),
      },
      {
        title: downloadTitle,
        enabled: (ctx) =>
          (ctx.fileFields && ctx.fileFields.length > 0) || (ctx.galleryFields && ctx.galleryFields.length > 0),
        task: (ctx) => this.downloadAttachments(ctx),
      },
      {
        title: createTitle,
        skip: (ctx) => ctx.entries.length === 0,
        task: (ctx) => this.createEntries(ctx),
      },
      {
        title: updateTitle,
        enabled: (ctx) => ctx.selfReferences && ctx.selfReferences.length > 0,
        task: (ctx) => this.updateEntries(ctx),
      },
    ])

    tasks
      .run({
        fromChannel,
        fromSite,
        toChannel,
        toSite,
        query: flags.query,
        per_page: flags.per_page,
        upsert: flags.upsert,
      })
      .catch(() => {})
  }

  private async fetchChannel(ctx: any) {
    let options: any = {}
    if (ctx.fromSite != null) {
      options.site = ctx.fromSite
    }
    try {
      ctx.channel = await this.nimbu.get(`/channels/${ctx.fromChannel}`, options)
      ctx.fileFields = ctx.channel.customizations.filter((f) => f.type === 'file')
      ctx.galleryFields = ctx.channel.customizations.filter((f) => f.type === 'gallery')
      ctx.selectFields = ctx.channel.customizations.filter((f) => f.type === 'select')
      ctx.multiSelectFields = ctx.channel.customizations.filter((f) => f.type === 'multi_select')
      ctx.selfReferences = ctx.channel.customizations.filter(
        (f) => (f.type === 'belongs_to' || f.type === 'belongs_to_many') && f.reference === ctx.channel.slug,
      )
    } catch (error) {
      if (error instanceof HTTPError) {
        if (error.body != null && error.body.code === 101) {
          throw new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
        } else {
          throw new Error(error.message)
        }
      }
    }
  }

  private async queryChannel(ctx: any, task: any) {
    let options: any = { fetchAll: true }
    if (ctx.fromSite != null) {
      options.site = ctx.fromSite
    }

    // first count the entries
    let baseUrl = `/channels/${ctx.fromChannel}/entries`
    let queryParts: string[] = ['include_slugs=1', 'x-cdn-expires=600']
    let queryFromCtx: string | undefined = ctx.query
    if (queryFromCtx !== undefined && queryFromCtx.trim() !== '') {
      queryParts.push(queryFromCtx.trim())
    }
    let perPageFromCtx: string | undefined = ctx.per_page
    let perPage = 30
    if (perPageFromCtx !== undefined && parseInt(perPageFromCtx, 10) > 0) {
      perPage = parseInt(perPageFromCtx, 10)
      queryParts.push(`per_page=${perPage}`)
    }
    let query = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
    let url = `${baseUrl}/count${query}`
    let result = await this.nimbu.get<Nimbu.CountResult>(url, options)
    ctx.count = result.count

    let nbPages = 1
    if (ctx.count > 0) {
      nbPages = Math.floor(ctx.count / perPage) + 1
    }
    ctx.entries = []

    return new Observable((observer) => {
      url = `${baseUrl}${query}`
      observer.next(`Fetching entries (page ${1} / ${nbPages})`)

      options.onNextPage = (next, last) => {
        observer.next(`Fetching entries (page ${next} / ${last})`)
      }

      this.nimbu
        .get<any>(url, options)
        .then(function (results) {
          task.title = `Got ${results.length} entries from ${chalk.bold(ctx.fromChannel)}`
          ctx.entries = results
          ctx.nbEntries = results.length
        })
        .then(() => observer.complete())
        .catch((error) => {
          if (error.body != null && error.body.code === 101) {
            throw new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
          } else {
            throw new Error(error.message)
          }
        })
    })
  }

  private async downloadAttachments(ctx: any) {
    return new Observable((observer) => {
      ;(async (observer, ctx) => {
        let i = 1
        ctx.files = {}

        for (let entry of ctx.entries) {
          for (let field of ctx.fileFields) {
            let fileObject = entry[field.name]
            if (fileObject != null) {
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

  private async downloadFile(observer, i, ctx, fileObject, cacheKey, fieldName) {
    let tmp = require('tmp-promise')
    let prettyBytes = require('pretty-bytes')
    let pathFinder = require('path')

    if (fileObject != null && fileObject !== null && fileObject.url != null) {
      let url =
        fileObject.url.replace('http://', 'https://') + (fileObject.url.includes('?') ? '&' : '?') + generateRandom(6)
      const { path, cleanup } = await tmp.file({ prefix: `${fieldName}-` })
      let filename = pathFinder.basename(url)

      try {
        await download(url, path, (bytes, percentage) => {
          observer.next(
            `[${i}/${ctx.nbEntries}] Downloading ${fieldName} => "${filename}" (${percentage}% of ${prettyBytes(
              bytes,
            )})`,
          )
        })
      } catch (error) {
        observer.error(error)
      }

      ctx.files[cacheKey] = { path, cleanup }
    }
  }

  private async createEntries(ctx: any) {
    return new Observable((observer) => {
      ;(async (observer, ctx) => {
        let i = 1
        let nbEntries = ctx.entries.length

        for (let original of ctx.entries) {
          let entry = clonedeep(original)

          for (let field of ctx.fileFields) {
            let file = entry[field.name]
            if (file != null) {
              const key = this.fileCacheKey(entry, field)
              if (ctx.files[key] != null) {
                delete entry[field.name].url
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

          // remove self references first, as we'll try to update this in a second pass
          for (let field of ctx.selfReferences) {
            if (entry[field.name] != null) {
              delete entry[field.name]
            }
          }

          observer.next(`[${i}/${nbEntries}] creating entry "${chalk.bold(entry.title_field_value)}"`)

          let options: any = {}
          if (ctx.toSite != null) {
            options.site = ctx.toSite
          }
          options.body = entry

          try {
            let created: any = await this.nimbu.post(`/channels/${ctx.toChannel}/entries`, options)

            // store id for second pass in case of self-references
            original.id = created.id
          } catch (error) {
            if (error instanceof HTTPError) {
              observer.error(
                new Error(
                  `[${i}/${nbEntries}] creating entry #${entry.id} failed: ${error.body.message} => ${JSON.stringify(
                    error.body.errors,
                  )}`,
                ),
              )
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

  private async updateEntries(ctx: any) {
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
              if (error instanceof HTTPError) {
                observer.error(
                  new Error(
                    `[${i}/${nbEntries}] updating entry #${entry.id} failed: ${error.body.message} => ${JSON.stringify(
                      error.body.errors,
                    )}`,
                  ),
                )
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

  private fileCacheKey(entry, field) {
    return `${entry.id}-${field.name}`
  }

  private galleryCacheKey(entry, field, image) {
    return `${entry.id}-${field.name}-${image.id}`
  }
}
