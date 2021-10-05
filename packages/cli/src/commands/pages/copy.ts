import Command from '../../command'
import { download, generateRandom } from '../../utils/files'

import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import fs from 'fs-extra'
import clonedeep from 'lodash.clonedeep'

export default class CopyPages extends Command {
  static description = 'copy page from one site to another'

  static args = [
    {
      name: 'fullpath',
      required: false,
      description: 'fullpath of pages to be copied',
      default: '*',
    },
  ]

  static flags = {
    from: flags.string({
      char: 'f', // shorter flag version
      description: 'subdomain of the source site',
    }),
    to: flags.string({
      char: 't', // shorter flag version
      description: 'subdomain of the destination site',
    }),
    toHost: flags.string({
      description: 'hostname of target Nimbu API',
    }),
    fromHost: flags.string({
      description: 'hostname of origin Nimbu API',
    }),
  }

  async execute() {
    const Listr = require('listr')
    const { flags, args } = this.parse(CopyPages)

    let fromSite = flags.from !== undefined ? flags.from! : this.nimbuConfig.site!
    let toSite = flags.to !== undefined ? flags.to! : this.nimbuConfig.site!
    let fromHost = flags.fromHost !== undefined ? flags.fromHost! : this.nimbuConfig.apiUrl
    let toHost = flags.toHost !== undefined ? flags.toHost! : this.nimbuConfig.apiUrl

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
      return
    }

    let fetchTitle = `Querying pages from site ${chalk.bold(fromSite)}`
    let downloadTitle = `Downloading attachments`
    let createTitle = `Creating pages in site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        title: fetchTitle,
        task: (ctx) => this.fetchPages(ctx),
      },
      {
        title: downloadTitle,
        skip: (ctx) => ctx.pages.length === 0,
        task: (ctx) => this.downloadAttachments(ctx),
      },
      {
        title: createTitle,
        task: (ctx) => this.createPages(ctx),
        skip: (ctx) => ctx.pages.length === 0,
      },
    ])

    tasks
      .run({
        fromSite,
        toSite,
        fromHost,
        toHost,
        files: {},
        query: args.fullpath,
      })
      .catch(() => {})
  }

  private async fetchPages(ctx: any) {
    let options: any = { fetchAll: true }
    if (ctx.fromSite != null) {
      options.site = ctx.fromSite
      options.host = ctx.fromHost
    }
    try {
      let query = ''
      if (ctx.query !== undefined && ctx.query.charAt(0) === '/') {
        ctx.query = ctx.query.substring(1) // fullpath does not have a slash at the start
      }
      if (ctx.query === '*') {
        // fetch all pages
      } else if (ctx.query.indexOf('*') !== -1) {
        query = `?fullpath.start=${ctx.query.replace('*', '')}`
      } else {
        query = `?fullpath=${ctx.query}`
      }
      ctx.pages = await this.nimbu.get(`/pages${query}`, options)
    } catch (error) {
      if (error.body != null && error.body.code === 101) {
        throw new Error(`could not find page matching ${chalk.bold(ctx.query)}`)
      } else {
        throw new Error(error.message)
      }
    }
  }

  private async createPages(ctx: any) {
    const perform = async (observer) => {
      let maxDepth = 0
      let crntIndex = 1

      const nbPages = ctx.pages.length
      for (let page of ctx.pages) {
        if (page.depth > maxDepth) {
          maxDepth = page.depth
        }
      }
      for (let i = 0; i <= maxDepth; i++) {
        for (let page of ctx.pages.filter((p) => p.depth === i)) {
          let targetPage: any
          ctx.currentPage = page

          try {
            observer.next(`[${crntIndex}/${nbPages}] Check if page ${page.fullpath} exists in site ${ctx.toSite}`)
            targetPage = await this.nimbu.get(`/pages/${page.fullpath}`, { site: ctx.toSite, host: ctx.toHost })
          } catch (error) {
            if (error.body === undefined || error.body.code !== 101) {
              throw new Error(`Error checking page ${chalk.bold(ctx.currentPage.fullpath)}: ${error.message}`)
            }
          }

          let data = await this.prepareUpload(crntIndex, ctx, page)

          try {
            if (targetPage != null) {
              observer.next(`[${crntIndex}/${nbPages}] Updating page ${page.fullpath} in site ${ctx.toSite}`)
              await this.nimbu.patch(`/pages/${page.fullpath}?replace=1`, {
                body: data,
                site: ctx.toSite,
                host: ctx.toHost,
              })
            } else {
              observer.next(`[${crntIndex}/${nbPages}] Creating page ${page.fullpath} in site ${ctx.toSite}`)
              await this.nimbu.post(`/pages`, {
                body: data,
                site: ctx.toSite,
                host: ctx.toHost,
              })
            }
          } catch (error) {
            throw new Error(`Error for page ${chalk.bold(ctx.currentPage.fullpath)}: ${error.message}`)
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
      for (let editableName of Object.keys(editables)) {
        let editable = editables[editableName]
        let fileObject = editable.file
        if (fileObject != null) {
          await this.downloadFile(observer, i, ctx, fileObject, editableName)
        }

        let repeatables = editable.repeatables
        if (repeatables != null && repeatables.length > 0) {
          for (let repeatable of repeatables) {
            await scanEditables(i, repeatable.items, observer)
          }
        }
      }
    }
    const perform = async (observer) => {
      let i = 1
      for (let page of ctx.pages) {
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

  private async downloadFile(observer, i, ctx, fileObject, fieldName) {
    let tmp = require('tmp-promise')
    let prettyBytes = require('pretty-bytes')
    let pathFinder = require('path')

    if (fileObject != null && fileObject !== null && fileObject.url != null) {
      let url = `${fileObject.url}${fileObject.url.indexOf('?') !== -1 ? '&v=' : '?'}${generateRandom(6)}`
      const { path, cleanup } = await tmp.file({ prefix: `${fieldName}-` })
      let filename = pathFinder.basename(url)

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

      ctx.files[fileObject.url] = { path, cleanup }
    }
  }

  private async prepareUpload(i: number, ctx: any, page: any) {
    let data = clonedeep(page)
    data.parent = data.parent_path

    const scanEditables = async (i, ctx, editables) => {
      for (let editableName of Object.keys(editables)) {
        let editable = editables[editableName]
        let fileObject = editable.file

        if (fileObject != null && fileObject.url != null && ctx.files[fileObject.url] != null) {
          fileObject.attachment = await fs.readFile(ctx.files[fileObject.url].path, { encoding: 'base64' })
          delete fileObject.url
        }

        let repeatables = editable.repeatables
        if (repeatables != null && repeatables.length > 0) {
          for (let repeatable of repeatables) {
            await scanEditables(i, ctx, repeatable.items)
          }
        }
      }
    }

    await scanEditables(i, ctx, data.items)

    return data
  }
}
