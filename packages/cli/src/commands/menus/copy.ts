import { APIError, Command } from '@nimbu-cli/command'
import { Args, Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import { cloneDeep } from 'lodash'
import { Observable } from 'rxjs'
const through = require('through')
const inquirer = require('inquirer')

export default class CopyMenus extends Command {
  static args = {
    slug: Args.string({
      description: 'permalink of menu to be copied',
      name: 'slug',
      required: false,
    }),
  }

  static description = 'copy menus from one site to another'

  static flags = {
    from: Flags.string({
      char: 'f', // shorter flag version
      description: 'subdomain of the source site',
    }),
    to: Flags.string({
      char: 't', // shorter flag version
      description: 'subdomain of the destination site',
    }),
  }

  async execute() {
    const Listr = require('listr')
    const { args, flags } = await this.parse(CopyMenus)

    const fromSite = flags.from === undefined ? this.nimbuConfig.site : flags.from
    const toSite = flags.to === undefined ? this.nimbuConfig.site : flags.to
    const { slug } = args

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
    }

    if (fromSite == null || toSite == null) {
      ux.error('You need to specify both the source and destination site.')
    }

    const fetchTitle = `Querying ${slug == null ? 'menus' : "menu '" + slug + "'"} from site ${chalk.bold(fromSite)}`
    const updateTitle = `Uploading ${slug == null ? 'menus' : "menu '" + slug + "'"} to site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        task: (ctx) => this.fetchMenus(ctx),
        title: fetchTitle,
      },
      {
        task: (ctx) => this.uploadMenus(ctx),
        title: updateTitle,
      },
    ])

    await tasks
      .run({
        fromSite,
        query: slug,
        toSite,
      })
      .catch((error) => this.error(error))
  }

  private askOverwrite(menu: any, ctx: any, observer: any) {
    let buffer = ''

    const outputStream: any = through((data) => {
      // eslint-disable-next-line no-control-regex
      if (/\u001B\[.*?(D|C)$/.test(data)) {
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
      default: false,
      message: `menu ${chalk.bold(menu.slug)} already exists. Update?`,
      name: 'overwrite',
      type: 'confirm',
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
      .catch((error) => {
        observer.error(error)
      })

    return outputStream
  }

  private cleanupMenu(original) {
    const menu = cloneDeep(original)

    const cleanupItems = (items) => {
      for (const item of items) {
        delete item.target_page

        if (item.children != null && item.children.length > 0) {
          cleanupItems(item.children)
        }
      }
    }

    cleanupItems(menu.items)
    return menu
  }

  private async create(menu: any, ctx: any, observer: any) {
    const options: any = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    options.body = this.cleanupMenu(menu)

    observer.next(`Creating menu ${chalk.bold(menu.slug)} in site ${chalk.bold(ctx.toSite)}`)

    return this.nimbu.post(`/menus`, options)
  }

  private async fetchMenus(ctx: any) {
    const options: any = { fetchAll: true }
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
      if (error instanceof APIError) {
        const error_ =
          error.body != null && error.body.code === 101
            ? new Error(`could not find menu matching ${chalk.bold(ctx.query)}`)
            : new Error(error.message)
        throw error_
      } else {
        throw error
      }
    }
  }

  private async update(menu: any, ctx: any, observer: any) {
    const options: any = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    options.body = this.cleanupMenu(menu)

    observer.next(`Updating menu ${chalk.bold(menu.slug)} in site ${chalk.bold(ctx.toSite)}`)

    try {
      return this.nimbu.patch(`/menus/${menu.slug}?replace=1`, options)
    } catch (error) {
      const error_ =
        error instanceof APIError && (error.body === undefined || error.body.code !== 101)
          ? new Error(JSON.stringify(error.message))
          : new Error(JSON.stringify(error))
      throw error_
    }
  }

  private async uploadMenus(ctx: any) {
    const perform = async (observer) => {
      const options: any = {}
      if (ctx.toSite != null) {
        options.site = ctx.toSite
      }

      for (const menu of ctx.menus) {
        let targetMenu: any
        const { slug } = menu

        try {
          targetMenu = await this.nimbu.get(`/menus/${slug}`, options)
        } catch (error) {
          if (error instanceof APIError) {
            if (error.body === undefined || error.body.code !== 101) {
              throw new Error(error.message)
            }
          } else {
            throw error
          }
        }

        await (targetMenu == null ? this.create(menu, ctx, observer) : this.askOverwrite(menu, ctx, observer))
      }
    }

    return new Observable((observer) => {
      perform(observer)
        .then(() => observer.complete())
        .catch((error) => observer.error(error))
    })
  }
}
