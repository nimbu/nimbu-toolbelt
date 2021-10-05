import Command from '../../command'
import { download } from '../../utils/files'

import { flags } from '@oclif/command'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import fs from 'fs-extra'
import pathFinder from 'path'

export default class CopyThemes extends Command {
  static description = 'copy themes from one site to another'

  static flags = {
    from: flags.string({
      char: 'f',
      description: 'slug of the source theme',
      required: true,
    }),
    to: flags.string({
      char: 't',
      description: 'slug of the target theme',
      required: true,
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
    const { flags } = this.parse(CopyThemes)

    let fromTheme: string
    let toTheme: string
    let fromSite: string | undefined
    let toSite: string | undefined
    let fromHost = flags.fromHost !== undefined ? flags.fromHost! : this.nimbuConfig.apiUrl
    let toHost = flags.toHost !== undefined ? flags.toHost! : this.nimbuConfig.apiUrl

    let fromParts = flags.from.split('/')
    if (fromParts.length > 1) {
      fromSite = fromParts[0]
      fromTheme = fromParts[1]
    } else {
      fromSite = fromParts[0]
      fromTheme = 'default-theme'
    }
    let toParts = flags.to.split('/')
    if (toParts.length > 1) {
      toSite = toParts[0]
      toTheme = toParts[1]
    } else {
      toSite = toParts[0]
      toTheme = 'default-theme'
    }

    let types = ['assets', 'snippets', 'layouts', 'templates']
    let taskList: any[] = []

    for (let type of types) {
      taskList.push({
        title: `Downloading ${type} from theme ${chalk.bold(fromTheme)} in site ${chalk.bold(fromSite)}`,
        task: (ctx) => this.fetchType(type, ctx),
        enabled: (ctx) => ctx[type] != null || types.indexOf(type) === ctx.currentStep,
      })
      taskList.push({
        title: `Uploading ${type} to theme ${chalk.bold(toTheme)} to site ${chalk.bold(toSite)}`,
        task: (ctx) => this.uploadType(type, ctx),
        skip: (ctx) => ctx[type].length === 0,
        enabled: (ctx) => ctx[type] != null,
      })
    }

    const tasks = new Listr(taskList)

    tasks
      .run({
        fromSite,
        toSite,
        fromTheme,
        toTheme,
        fromHost,
        toHost,
        currentStep: 0,
        files: {},
      })
      .catch(() => {})
  }

  private async fetchType(type: string, ctx: any) {
    let options: any = {
      fetchAll: true,
      site: ctx.fromSite,
      host: ctx.fromHost,
    }

    const perform = async (observer) => {
      try {
        let items: any[] = await this.nimbu.get(`/themes/${ctx.fromTheme}/${type}`, options)
        let nbItems = items.length
        let crntIndex = 1
        let itemsWithCode: any[] = []
        for (let item of items) {
          let name: string
          if (type === 'assets') {
            name = item.path.substring(1)
          } else {
            name = item.name
          }
          let prefix = `[${crntIndex}/${nbItems}]`
          observer.next(`${prefix} Fetching ${type.slice(0, -1)} ${name}`)
          let itemWithCode: any = await this.nimbu.get(`/themes/${ctx.fromTheme}/${type}/${name}`, options)
          if (itemWithCode.public_url != null) {
            itemsWithCode.push({
              name: itemWithCode.path,
              file: itemWithCode.public_url,
            })
          } else {
            itemsWithCode.push({
              name: itemWithCode.name,
              code: itemWithCode.code,
            })
          }
          crntIndex++
        }
        ctx[type] = itemsWithCode
        if (itemsWithCode.length === 0) {
          ctx.currentStep++
        }
      } catch (error) {
        throw new Error(error.message)
      }
    }

    return new Observable((observer) => {
      perform(observer)
        .then(() => observer.complete())
        .catch((error) => observer.error(error))
    })
  }

  private async uploadType(type: string, ctx: any) {
    const perform = async (observer) => {
      let items = ctx[type]
      let nbItems = items.length
      let crntIndex = 1

      for (let item of items) {
        let prefix = `[${crntIndex}/${nbItems}]`
        try {
          observer.next(`${prefix} Updating ${type.slice(0, -1)} ${item.name} in site ${ctx.toSite}`)
          if (item.file != null) {
            let { path, cleanup } = await this.downloadFile(observer, prefix, item)
            let filename = pathFinder.basename(item.file.split('?')[0])
            let base64 = await fs.readFile(path, { encoding: 'base64' })
            await this.nimbu.post(`/themes/${ctx.toTheme}/${type}`, {
              body: {
                name: item.name,
                file: {
                  __type: 'File',
                  filename,
                  attachment: base64,
                },
              },
              site: ctx.toSite,
              host: ctx.toHost,
            })
            cleanup()
          } else {
            await this.nimbu.post(`/themes/${ctx.toTheme}/${type}`, {
              body: item,
              site: ctx.toSite,
              host: ctx.toHost,
            })
          }
        } catch (error) {
          throw new Error(`Error with ${chalk.bold(item.name)}: ${error.message}`)
        }

        crntIndex++
      }

      ctx.currentStep++
    }

    return new Observable((observer) => {
      perform(observer)
        .then(() => observer.complete())
        .catch((error) => observer.error(error))
    })
  }

  private async downloadFile(observer, prefix, item) {
    let tmp = require('tmp-promise')
    let prettyBytes = require('pretty-bytes')

    const { path, cleanup } = await tmp.file({ prefix: `nimbu-asset-` })
    try {
      await download(item.file, path, (bytes, percentage) => {
        observer.next(`${prefix} Downloading ${item.name} (${percentage}% of ${prettyBytes(bytes)})`)
      })
    } catch (error) {
      observer.error(error)
    }

    return { path, cleanup }
  }
}
