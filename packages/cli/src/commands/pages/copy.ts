import { APIError, Command } from '@nimbu-cli/command'
import { Args, Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import { cloneDeep } from 'lodash'
import { Observable } from 'rxjs'

import { download, generateRandom } from '../../utils/files'

export default class CopyPages extends Command {
  static args = {
    fullpath: Args.string({
      default: '*',
      description: 'fullpath of pages to be copied',
      name: 'fullpath',
      required: false,
    }),
  }

  static description = 'copy page from one site to another'

  static flags = {
    from: Flags.string({
      char: 'f', // shorter flag version
      description: 'subdomain of the source site',
    }),
    fromHost: Flags.string({
      description: 'hostname of origin Nimbu API',
    }),
    to: Flags.string({
      char: 't', // shorter flag version
      description: 'subdomain of the destination site',
    }),
    toHost: Flags.string({
      description: 'hostname of target Nimbu API',
    }),
  }

  async execute() {
    const Listr = require('listr')
    const { args, flags } = await this.parse(CopyPages)

    const fromSite = flags.from === undefined ? this.nimbuConfig.site : flags.from
    const toSite = flags.to === undefined ? this.nimbuConfig.site : flags.to
    const fromHost = flags.fromHost === undefined ? this.nimbuConfig.apiUrl : flags.fromHost
    const toHost = flags.toHost === undefined ? this.nimbuConfig.apiUrl : flags.toHost

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
    }

    if (fromSite == null || toSite == null) {
      ux.error('You need to specify both the source and destination site.')
    }

    const fetchTitle = `Querying pages from site ${chalk.bold(fromSite)}`
    const downloadTitle = `Downloading attachments`
    const createTitle = `Creating pages in site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        task: (ctx) => this.fetchPages(ctx),
        title: fetchTitle,
      },
      {
        skip: (ctx) => ctx.pages.length === 0,
        task: (ctx) => this.downloadAttachments(ctx),
        title: downloadTitle,
      },
      {
        skip: (ctx) => ctx.pages.length === 0,
        task: (ctx) => this.createPages(ctx),
        title: createTitle,
      },
    ])

    await tasks
      .run({
        files: {},
        fromHost,
        fromSite,
        query: args.fullpath,
        toHost,
        toSite,
      })
      .catch((error) => this.error(error))
  }

  private async createPages(ctx: any) {
    const perform = async (observer) => {
      let maxDepth = 0
      let crntIndex = 1

      const nbPages = ctx.pages.length
      for (const page of ctx.pages) {
        if (page.depth > maxDepth) {
          maxDepth = page.depth
        }
      }

      for (let i = 0; i <= maxDepth; i++) {
        for (const page of ctx.pages.filter((p) => p.depth === i)) {
          let targetPage: any
          ctx.currentPage = page

          try {
            observer.next(`[${crntIndex}/${nbPages}] Check if page ${page.fullpath} exists in site ${ctx.toSite}`)
            targetPage = await this.nimbu.get(`/pages/${page.fullpath}`, { host: ctx.toHost, site: ctx.toSite })
          } catch (error) {
            if (error instanceof APIError) {
              if (error.body === undefined || error.body.code !== 101) {
                throw new Error(`Error checking page ${chalk.bold(ctx.currentPage.fullpath)}: ${error.message}`)
              }
            } else {
              throw error
            }
          }

          const data = await this.prepareUpload(crntIndex, ctx, page)

          try {
            if (targetPage == null) {
              observer.next(`[${crntIndex}/${nbPages}] Creating page ${page.fullpath} in site ${ctx.toSite}`)
              await this.nimbu.post(`/pages`, {
                body: data,
                host: ctx.toHost,
                site: ctx.toSite,
              })
            } else {
              observer.next(`[${crntIndex}/${nbPages}] Updating page ${page.fullpath} in site ${ctx.toSite}`)
              await this.nimbu.patch(`/pages/${page.fullpath}?replace=1`, {
                body: data,
                host: ctx.toHost,
                site: ctx.toSite,
              })
            }
          } catch (error) {
            if (error instanceof Error) {
              throw new TypeError(`Error for page ${chalk.bold(ctx.currentPage.fullpath)}: ${error.message}`)
            }
          }

          crntIndex++
        }
      }
    }

    return new Observable((observer) => {
      perform(observer)
        .then(() => observer.complete())
        .catch((error) => observer.error(error))
    })
  }

  private async downloadAttachments(ctx: any) {
    const scanEditables = async (i, editables, observer) => {
      for (const editableName of Object.keys(editables)) {
        const editable = editables[editableName]
        const fileObject = editable.file
        if (fileObject != null) {
          await this.downloadFile(observer, i, ctx, fileObject, editableName)
        }

        const { repeatables } = editable
        if (repeatables != null && repeatables.length > 0) {
          for (const repeatable of repeatables) {
            await scanEditables(i, repeatable.items, observer)
          }
        }
      }
    }

    const perform = async (observer) => {
      let i = 1
      for (const page of ctx.pages) {
        await scanEditables(i, page.items, observer)
        i++
      }
    }

    return new Observable((observer) => {
      perform(observer)
        .then(() => observer.complete())
        .catch((error) => observer.error(error))
    })
  }

  // eslint-disable-next-line max-params
  private async downloadFile(observer, i, ctx, fileObject, fieldName) {
    const tmp = require('tmp-promise')
    const prettyBytes = require('pretty-bytes')
    const pathFinder = require('node:path')

    if (fileObject != null && fileObject !== null && fileObject.url != null) {
      const url = `${fileObject.url}${fileObject.url.includes('?') ? '&v=' : '?'}${generateRandom(6)}`
      const { cleanup, path } = await tmp.file({ prefix: `${fieldName}-` })
      const filename = pathFinder.basename(url)

      try {
        await download(url, path, (bytes, percentage) => {
          observer.next(
            `[${i}/${ctx.pages.length}] Downloading ${fieldName} => "${filename}" (${percentage}% of ${prettyBytes(
              bytes,
            )})`,
          )
        })
      } catch (error) {
        observer.error(error)
      }

      ctx.files[fileObject.url] = { cleanup, path }
    }
  }

  private async fetchPages(ctx: any) {
    const options: any = { fetchAll: true }
    if (ctx.fromSite != null) {
      options.site = ctx.fromSite
      options.host = ctx.fromHost
    }

    try {
      let query = ''
      if (ctx.query !== undefined && ctx.query.charAt(0) === '/') {
        ctx.query = ctx.query.slice(1) // fullpath does not have a slash at the start
      }

      if (ctx.query === '*') {
        // fetch all pages
      } else if (ctx.query.includes('*')) {
        query = `?fullpath.start=${ctx.query.replace('*', '')}`
      } else {
        query = `?fullpath=${ctx.query}`
      }

      ctx.pages = await this.nimbu.get(`/pages${query}`, options)
    } catch (error) {
      if (error instanceof APIError) {
        const error_ =
          error.body != null && error.body.code === 101
            ? new Error(`could not find page matching ${chalk.bold(ctx.query)}`)
            : new Error(error.message)
        throw error_
      } else {
        throw error
      }
    }
  }

  private async prepareUpload(i: number, ctx: any, page: any) {
    const data = cloneDeep(page)
    data.parent = data.parent_path

    const scanEditables = async (i, ctx, editables) => {
      for (const editableName of Object.keys(editables)) {
        const editable = editables[editableName]
        const fileObject = editable.file

        if (fileObject != null && fileObject.url != null && ctx.files[fileObject.url] != null) {
          fileObject.attachment = await fs.readFile(ctx.files[fileObject.url].path, { encoding: 'base64' })
          delete fileObject.url
        }

        const { repeatables } = editable
        if (repeatables != null && repeatables.length > 0) {
          for (const repeatable of repeatables) {
            await scanEditables(i, ctx, repeatable.items)
          }
        }
      }
    }

    await scanEditables(i, ctx, data.items)

    return data
  }
}
