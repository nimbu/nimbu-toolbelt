import Command from '@nimbu-cli/command'
import { download } from '../../utils/files'

import { Flags } from '@oclif/core'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import * as fs from 'fs-extra'
import * as pathFinder from 'path'

export default class PullThemes extends Command {
  static description = 'download all code and assets for a theme'

  static flags = {
    theme: Flags.string({
      char: 't',
      description: 'slug of the theme',
      default: 'default-theme',
    }),
    site: Flags.string({
      char: 's',
      description: 'the site of the theme',
    }),
    'liquid-only': Flags.boolean({
      description: 'only download template files',
    }),
  }

  async execute() {
    if (process.env.DEBUG != null) {
      process.stdout.isTTY = false
    }

    const Listr = require('listr')
    const { flags } = await this.parse(PullThemes)

    let fromTheme = flags.theme
    let fromSite = flags.site !== undefined ? flags.site! : this.nimbuConfig.site!

    let types = ['layouts', 'templates', 'snippets']
    if (!flags['liquid-only']) {
      types.push('assets')
    }
    let taskList: any[] = []

    for (let type of types) {
      taskList.push({
        title: `Downloading ${type} from theme ${chalk.bold(fromTheme)} in site ${chalk.bold(fromSite)}`,
        task: (ctx) => this.fetchType(type, ctx),
        enabled: (ctx) => ctx[type] != null || types.indexOf(type) === ctx.currentStep,
      })
    }

    const tasks = new Listr(taskList)

    tasks
      .run({
        fromSite,
        fromTheme,
        currentStep: 0,
        files: {},
      })
      .catch((error) => this.error(error))
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
        let name: string
        for (let item of items) {
          if (type === 'assets') {
            name = item.path.substring(1)
          } else {
            name = item.name
          }
          let prefix = `[${crntIndex}/${nbItems}]`
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
          if (itemWithCode.public_url != null) {
            let path, cleanup: any
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
            let targetFile = this.nimbuConfig.projectPath + item.path
            let targetPath = pathFinder.dirname(targetFile)
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
          } else {
            let targetFile = this.nimbuConfig.projectPath + '/' + type + '/' + itemWithCode.name
            let targetPath = pathFinder.dirname(targetFile)
            try {
              await fs.mkdirp(targetPath)
              await fs.writeFile(targetFile, itemWithCode.code ?? '')
            } catch (error) {
              if (error instanceof Error) {
                console.error('could not write file', targetFile)
                this.error(error)
              }
            }
          }
          crntIndex++
        }
        ctx[type] = itemsWithCode
        if (itemsWithCode.length === 0) {
          ctx.currentStep++
        }
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message)
        }
      }
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
      await download(item.public_url, path, (bytes, percentage) => {
        observer.next(`${prefix} Downloading ${item.name} (${percentage}% of ${prettyBytes(bytes)})`)
      })
    } catch (error) {
      observer.error(error)
    }

    return { path, cleanup }
  }
}
