import Command from '../../command'
import { download } from '../../utils/files'

import { flags } from '@oclif/command'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import fs from 'fs-extra'
import pathFinder from 'path'

export default class PullThemes extends Command {
  static description = 'download all code and assets for a theme'

  static flags = {
    theme: flags.string({
      char: 't',
      description: 'slug of the theme',
      default: 'default-theme',
    }),
    site: flags.string({
      char: 's',
      description: 'the site of the theme',
    }),
    'liquid-only': flags.boolean({
      description: 'only download template files',
    }),
  }

  async execute() {
    const Listr = require('listr')
    const { flags } = this.parse(PullThemes)

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
            let { path, cleanup } = await this.downloadFile(observer, prefix, itemWithCode)
            let targetFile = this.nimbuConfig.projectPath + item.path
            let targetPath = pathFinder.dirname(targetFile)
            await fs.mkdirp(targetPath)
            await fs.copyFile(path, targetFile)
            cleanup()
          } else {
            let targetFile = this.nimbuConfig.projectPath + '/' + type + '/' + itemWithCode.name
            let targetPath = pathFinder.dirname(targetFile)
            await fs.mkdirp(targetPath)
            await fs.writeFile(targetFile, itemWithCode.code)
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
