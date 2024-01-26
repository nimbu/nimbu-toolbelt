import { Command } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import * as fs from 'fs-extra'
import * as pathFinder from 'node:path'
import { Observable } from 'rxjs'

import { download } from '../../utils/files'

export default class PullThemes extends Command {
  static description = 'download all code and assets for a theme'

  static flags = {
    'liquid-only': Flags.boolean({
      description: 'only download template files',
    }),
    site: Flags.string({
      char: 's',
      description: 'the site of the theme',
    }),
    theme: Flags.string({
      char: 't',
      default: 'default-theme',
      description: 'slug of the theme',
    }),
  }

  async execute() {
    if (process.env.DEBUG != null) {
      process.stdout.isTTY = false
    }

    const Listr = require('listr')
    const { flags } = await this.parse(PullThemes)

    const fromTheme = flags.theme
    const fromSite = flags.site === undefined ? this.nimbuConfig.site : flags.site

    if (fromSite == null) {
      ux.error('You need to specify both the site.')
    }

    const types = ['layouts', 'templates', 'snippets']
    if (!flags['liquid-only']) {
      types.push('assets')
    }

    const taskList: any[] = []

    for (const type of types) {
      taskList.push({
        enabled: (ctx) => ctx[type] != null || types.indexOf(type) === ctx.currentStep,
        task: (ctx) => this.fetchType(type, ctx),
        title: `Downloading ${type} from theme ${chalk.bold(fromTheme)} in site ${chalk.bold(fromSite)}`,
      })
    }

    const tasks = new Listr(taskList)

    tasks
      .run({
        currentStep: 0,
        files: {},
        fromSite,
        fromTheme,
      })
      .catch((error) => this.error(error))
  }

  private async downloadFile(observer, prefix, item) {
    const tmp = require('tmp-promise')
    const prettyBytes = require('pretty-bytes')

    const { cleanup, path } = await tmp.file({ prefix: `nimbu-asset-` })
    try {
      await download(item.public_url, path, (bytes, percentage) => {
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
        let name: string
        for (const item of items) {
          name = type === 'assets' ? item.path.slice(1) : item.name
          const prefix = `[${crntIndex}/${nbItems}]`
          observer.next(`${prefix} Fetching ${type.slice(0, -1)} ${name}`)
          let itemWithCode: any
          try {
            itemWithCode = await this.nimbu.get(`/themes/${ctx.fromTheme}/${type}/${name}`, options)
          } catch (error) {
            if (error instanceof Error) {
              console.error('could not fetch item', `/themes/${ctx.fromTheme}/${type}/${name}`)
              this.error(error)
            }
          }

          if (itemWithCode.public_url == null) {
            const targetFile = this.nimbuConfig.projectPath + '/' + type + '/' + itemWithCode.name
            const targetPath = pathFinder.dirname(targetFile)
            try {
              await fs.mkdirp(targetPath)
              await fs.writeFile(targetFile, itemWithCode.code ?? '')
            } catch (error) {
              if (error instanceof Error) {
                console.error('could not write file', targetFile)
                this.error(error)
              }
            }
          } else {
            let path
            let cleanup: any
            try {
              const result = await this.downloadFile(observer, prefix, itemWithCode)
              path = result.path
              cleanup = result.cleanup
            } catch (error) {
              if (error instanceof Error) {
                console.error('could not download file', itemWithCode.public_url)
                this.error(error)
              }
            }

            const targetFile = this.nimbuConfig.projectPath + item.path
            const targetPath = pathFinder.dirname(targetFile)
            try {
              await fs.mkdirp(targetPath)
              await fs.copyFile(path, targetFile)
            } catch (error) {
              if (error instanceof Error) {
                console.error('could not write file', targetFile)
                this.error(error)
              }
            }

            cleanup()
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
}
