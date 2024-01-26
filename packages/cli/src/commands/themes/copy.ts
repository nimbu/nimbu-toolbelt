import { Command } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import { capitalize } from 'lodash'
import * as pathFinder from 'node:path'
import { Observable } from 'rxjs'

import { download } from '../../utils/files'

export default class CopyThemes extends Command {
  static description = 'copy themes from one site to another'

  static flags = {
    from: Flags.string({
      char: 'f',
      description: 'slug of the source theme',
      required: true,
    }),
    fromHost: Flags.string({
      description: 'hostname of origin Nimbu API',
    }),
    'liquid-only': Flags.boolean({
      description: 'only copy the templates',
    }),
    to: Flags.string({
      char: 't',
      description: 'slug of the target theme',
      required: true,
    }),
    toHost: Flags.string({
      description: 'hostname of target Nimbu API',
    }),
  }

  async execute() {
    const Listr = require('listr')
    const { flags } = await this.parse(CopyThemes)

    let fromTheme: string
    let toTheme: string
    let fromSite: string | undefined
    let toSite: string | undefined
    const fromHost = flags.fromHost === undefined ? this.nimbuConfig.apiUrl : flags.fromHost
    const toHost = flags.toHost === undefined ? this.nimbuConfig.apiUrl : flags.toHost

    const fromParts = flags.from.split('/')
    if (fromParts.length > 1) {
      fromSite = fromParts[0]
      fromTheme = fromParts[1]
    } else {
      fromSite = fromParts[0]
      fromTheme = 'default-theme'
    }

    const toParts = flags.to.split('/')
    if (toParts.length > 1) {
      toSite = toParts[0]
      toTheme = toParts[1]
    } else {
      toSite = toParts[0]
      toTheme = 'default-theme'
    }

    const types = ['snippets', 'layouts', 'templates']
    if (!flags['liquid-only']) {
      types.unshift('assets')
    }

    const taskList: any[] = []
    this.log(
      `Copying theme ${chalk.bold(fromTheme)} from ${chalk.bold(fromSite)} to ${
        toTheme === fromTheme ? '' : `theme ${chalk.bold(toTheme)} in `
      }site ${chalk.bold(toSite)}:\n`,
    )

    for (const type of types) {
      taskList.push({
        task: (_ctx, _task) =>
          new Listr([
            {
              enabled: (ctx) => ctx[type] != null || types.indexOf(type) === ctx.currentStep,
              task: (ctx) => this.fetchType(type, ctx),
              title: `Downloading ${type}`,
            },
            {
              enabled: (ctx) => ctx[type] != null,
              skip: (ctx) => ctx[type].length === 0,
              task: (ctx) => this.uploadType(type, ctx),
              title: `Uploading ${type}`,
            },
          ]),
        title: capitalize(type),
      })
    }

    const tasks = new Listr(taskList)

    await tasks
      .run({
        currentStep: 0,
        files: {},
        fromHost,
        fromSite,
        fromTheme,
        toHost,
        toSite,
        toTheme,
      })
      .catch((error) => this.error(error))
  }

  private async downloadFile(observer, prefix, item) {
    const tmp = require('tmp-promise')
    const prettyBytes = require('pretty-bytes')

    const { cleanup, path } = await tmp.file({ prefix: `nimbu-asset-` })
    try {
      await download(item.file, path, (bytes, percentage) => {
        observer.next(`${prefix} Downloading ${item.name} (${percentage}% of ${prettyBytes(bytes)})`)
      })
    } catch (error) {
      observer.error(error)
    }

    return { cleanup, path }
  }

  private async fetchType(type: string, ctx: any) {
    const options: any = {
      fetchAll: true,
      host: ctx.fromHost,
      site: ctx.fromSite,
    }

    const perform = async (observer) => {
      try {
        const items: any[] = await this.nimbu.get(`/themes/${ctx.fromTheme}/${type}`, options)
        const nbItems = items.length
        let crntIndex = 1
        const itemsWithCode: any[] = []
        for (const item of items) {
          const name: string = type === 'assets' ? item.path.slice(1) : item.name
          const prefix = `[${crntIndex}/${nbItems}]`
          observer.next(`${prefix} Fetching ${type.slice(0, -1)} ${name}`)
          const itemWithCode: any = await this.nimbu.get(`/themes/${ctx.fromTheme}/${type}/${name}`, options)
          if (itemWithCode.public_url == null) {
            itemsWithCode.push({
              code: itemWithCode.code,
              name: itemWithCode.name,
            })
          } else {
            itemsWithCode.push({
              file: itemWithCode.public_url,
              name: itemWithCode.path,
            })
          }

          crntIndex++
        }

        ctx[type] = itemsWithCode
        if (itemsWithCode.length === 0) {
          ctx.currentStep++
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new TypeError(error.message)
        }
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
      const items = ctx[type]
      const nbItems = items.length
      let crntIndex = 1

      for (const item of items) {
        const prefix = `[${crntIndex}/${nbItems}]`
        try {
          observer.next(`${prefix} Updating ${type.slice(0, -1)} ${item.name} in site ${ctx.toSite}`)
          if (item.file == null) {
            await this.nimbu.post(`/themes/${ctx.toTheme}/${type}`, {
              body: item,
              host: ctx.toHost,
              site: ctx.toSite,
            })
          } else {
            const { cleanup, path } = await this.downloadFile(observer, prefix, item)
            const filename = pathFinder.basename(item.file.split('?')[0])
            const base64 = await fs.readFile(path, { encoding: 'base64' })
            await this.nimbu.post(`/themes/${ctx.toTheme}/${type}`, {
              body: {
                file: {
                  __type: 'File',
                  attachment: base64,
                  filename,
                },
                name: item.name,
              },
              host: ctx.toHost,
              site: ctx.toSite,
            })
            cleanup()
          }
        } catch (error) {
          if (error instanceof Error) {
            throw new TypeError(`Error with ${chalk.bold(item.name)}: ${error.message}`)
          }
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
}
