import Command from '../../command'

import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import through from 'through'
import inquirer from 'inquirer'
import clonedeep from 'lodash.clonedeep'

export default class CopyMenus extends Command {
  static description = 'copy menus from one site to another'

  static args = [
    {
      name: 'slug',
      required: false,
      description: 'permalink of menu to be copied',
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
  }

  async execute() {
    const Listr = require('listr')
    const { flags, args } = this.parse(CopyMenus)

    let fromSite = flags.from !== undefined ? flags.from! : this.nimbuConfig.site!
    let toSite = flags.to !== undefined ? flags.to! : this.nimbuConfig.site!
    let slug = args.slug

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
      return
    }

    let fetchTitle = `Querying ${slug != null ? "menu '" + slug + "'" : 'menus'} from site ${chalk.bold(fromSite)}`
    let updateTitle = `Uploading ${slug != null ? "menu '" + slug + "'" : 'menus'} to site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        title: fetchTitle,
        task: (ctx) => this.fetchMenus(ctx),
      },
      {
        title: updateTitle,
        task: (ctx) => this.uploadMenus(ctx),
      },
    ])

    tasks
      .run({
        fromSite,
        toSite,
        query: args.slug,
      })
      .catch(() => {})
  }

  private async fetchMenus(ctx: any) {
    let options: any = { fetchAll: true }
    if (ctx.fromSite != null) {
      options.site = ctx.fromSite
    }
    try {
      let query = ''

      if (ctx.query !== undefined && ctx.query.trim() !== '') {
        query = `&slug=${ctx.query}`
      }

      ctx.menus = await this.nimbu.get(`/menus?nested=1${query}`, options)

      if (ctx.menus.length === 0 && query !== '') {
        throw new Error(`could not find menu matching ${chalk.bold(ctx.query)}`)
      }
    } catch (error) {
      if (error.body != null && error.body.code === 101) {
        throw new Error(`could not find menu matching ${chalk.bold(ctx.query)}`)
      } else {
        throw new Error(error.message)
      }
    }
  }

  private async uploadMenus(ctx: any) {
    const perform = async (observer) => {
      let options: any = {}
      if (ctx.toSite != null) {
        options.site = ctx.toSite
      }

      for (let menu of ctx.menus) {
        let targetMenu: any
        let slug = menu.slug

        try {
          targetMenu = await this.nimbu.get(`/menus/${slug}`, options)
        } catch (error) {
          if (error.body === undefined || error.body.code !== 101) {
            throw new Error(error.message)
          }
        }

        if (targetMenu != null) {
          await this.askOverwrite(menu, ctx, observer)
        } else {
          await this.create(menu, ctx, observer)
        }
      }
    }
    return new Observable((observer) => {
      perform(observer)
        .then(() => observer.complete())
        .catch((error) => observer.error(error))
    })
  }

  private async create(menu: any, ctx: any, observer: any) {
    let options: any = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    options.body = this.cleanupMenu(menu)

    observer.next(`Creating menu ${chalk.bold(menu.slug)} in site ${chalk.bold(ctx.toSite)}`)

    return this.nimbu.post(`/menus`, options)
  }

  private async update(menu: any, ctx: any, observer: any) {
    let options: any = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    options.body = this.cleanupMenu(menu)

    observer.next(`Updating menu ${chalk.bold(menu.slug)} in site ${chalk.bold(ctx.toSite)}`)

    try {
      return this.nimbu.patch(`/menus/${menu.slug}?replace=1`, options)
    } catch (error) {
      if (error.body === undefined || error.body.code !== 101) {
        throw new Error(JSON.stringify(error.message))
      } else {
        throw new Error(JSON.stringify(error))
      }
    }
  }

  private askOverwrite(menu: any, ctx: any, observer: any) {
    let buffer = ''

    const outputStream = through((data) => {
      if (/\u001b\[.*?(D|C)$/.test(data)) {
        if (buffer.length > 0) {
          observer.next(buffer)
          buffer = ''
        }
        return
      }

      buffer += data
    })

    const prompt = inquirer.createPromptModule({
      output: outputStream,
    })

    prompt({
      type: 'confirm',
      name: 'overwrite',
      message: `menu ${chalk.bold(menu.slug)} already exists. Update?`,
      default: false,
    })
      .then((answer) => {
        // Clear the output
        observer.next()

        if (answer.overwrite) {
          return this.update(menu, ctx, observer)
        }
      })
      .then(() => {
        observer.complete()
      })
      .catch((err) => {
        observer.error(err)
      })

    return outputStream
  }

  private cleanupMenu(original) {
    let menu = clonedeep(original)

    const cleanupItems = (items) => {
      for (let item of items) {
        delete item.target_page

        if (item.children != null && item.children.length > 0) {
          cleanupItems(item.children)
        }
      }
    }

    cleanupItems(menu.items)
    return menu
  }
}
