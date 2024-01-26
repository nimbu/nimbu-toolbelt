import { Command } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import { Observable } from 'rxjs'
const through = require('through')
const inquirer = require('inquirer')

export default class CopyProductsConfig extends Command {
  static description = 'copy product customizations from one to another'

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
    const { flags } = await this.parse(CopyProductsConfig)

    const fromSite = flags.from === undefined ? this.nimbuConfig.site : flags.from
    const toSite = flags.to === undefined ? this.nimbuConfig.site : flags.to

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
      return
    }

    if (fromSite == null || toSite == null) {
      ux.error('You need to specify both the source and destination site.')
    }

    const fetchTitle = `Fetching product customizations from site ${chalk.bold(fromSite)}`
    const upsertTitle = `Copying product customizations to site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        task: (ctx) => this.fetch(ctx),
        title: fetchTitle,
      },
      {
        enabled: (ctx) => ctx.customizations != null,
        task: (ctx, task) => this.copy(ctx, task),
        title: upsertTitle,
      },
    ])

    await tasks
      .run({
        fromSite,
        toSite,
      })
      .catch((error) => this.error(error))
  }

  private askOverwrite(ctx: any, task: any) {
    return new Observable((observer) => {
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
        message: `Are you sure you want to overwrite the existing customizations?`,
        name: 'overwrite',
        type: 'confirm',
      })
        .then((answer) => {
          // Clear the output
          observer.next()

          if (answer.overwrite) {
            return this.update(ctx, task)
          }

          task.skip(`Skipping update product customizations ${ctx.toSite}`)
        })
        .then(() => {
          observer.complete()
        })
        .catch((error) => {
          observer.error(error)
        })

      return outputStream
    })
  }

  private async copy(ctx: any, task: any) {
    const options: any = { site: ctx.toSite }
    let targetCustomizations: any

    // check if any target customizations exists
    try {
      targetCustomizations = await this.nimbu.get(`/products/customizations`, options)
    } catch (error) {
      if (error instanceof Error) {
        throw new TypeError(error.message)
      }
    }

    if (targetCustomizations.length > 0) {
      return this.askOverwrite(ctx, task)
    }

    return this.create(ctx, task)
  }

  private async create(ctx: any, task: any) {
    const options: any = {
      body: ctx.customizations,
      site: ctx.toSite,
    }

    task.title = `Copying customizations to site ${chalk.bold(ctx.toSite)}`

    return this.nimbu.post(`/products/customizations`, options)
  }

  private async fetch(ctx: any) {
    const options: any = {
      site: ctx.fromSite,
    }
    try {
      ctx.customizations = await this.nimbu.get(`/products/customizations`, options)
    } catch (error) {
      if (error instanceof Error) {
        throw new TypeError(error.message)
      }
    }
  }

  private async update(ctx: any, task: any) {
    const options: any = {
      body: ctx.customizations,
      site: ctx.toSite,
    }

    task.title = `Updating customizations in site ${chalk.bold(ctx.toSite)}`

    return this.nimbu.post(`/products/customizations?replace=1`, options)
  }
}
