import Command, { APIError } from '@nimbu-cli/command'

import { CliUx, Flags } from '@oclif/core'
import chalk from 'chalk'
import { Observable } from 'rxjs'
const through = require('through')
const inquirer = require('inquirer')

export default class CopyCustomerConfig extends Command {
  static description = 'copy customer customizations from one to another'

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
    const { flags } = await this.parse(CopyCustomerConfig)

    let fromSite = flags.from !== undefined ? flags.from! : this.nimbuConfig.site!
    let toSite = flags.to !== undefined ? flags.to! : this.nimbuConfig.site!

    if (fromSite === toSite) {
      CliUx.ux.error('The source site needs to differ from the destination.')
    }

    let fetchTitle = `Fetching customer customizations from site ${chalk.bold(fromSite)}`
    let upsertTitle = `Copying customer customizations to site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        title: fetchTitle,
        task: (ctx) => this.fetch(ctx),
      },
      {
        title: upsertTitle,
        enabled: (ctx) => ctx.customizations != null,
        task: (ctx, task) => this.copy(ctx, task),
      },
    ])

    tasks
      .run({
        fromSite,
        toSite,
      })
      .catch((error) => this.error(error))
  }

  private async fetch(ctx: any) {
    let options: any = {
      site: ctx.fromSite,
    }
    try {
      ctx.customizations = await this.nimbu.get(`/customers/customizations`, options)
    } catch (error) {
      if (error instanceof APIError) {
        throw new Error(error.message)
      } else {
        throw error
      }
    }
  }

  private async copy(ctx: any, task: any) {
    let options: any = { site: ctx.toSite }
    let targetCustomizations: any

    // check if any target customizations exists
    try {
      targetCustomizations = await this.nimbu.get(`/customers/customizations`, options)
    } catch (error) {
      if (error instanceof APIError) {
        throw new Error(error.message)
      } else {
        throw error
      }
    }

    if (targetCustomizations.length > 0) {
      return this.askOverwrite(ctx, task)
    } else {
      return this.create(ctx, task)
    }
  }

  private async create(ctx: any, task: any) {
    let options: any = {
      site: ctx.toSite,
      body: ctx.customizations,
    }

    task.title = `Copying customizations to site ${chalk.bold(ctx.toSite)}`

    return this.nimbu.post(`/customers/customizations`, options)
  }

  private async update(ctx: any, task: any) {
    let options: any = {
      site: ctx.toSite,
      body: ctx.customizations,
    }

    task.title = `Updating customizations in site ${chalk.bold(ctx.toSite)}`

    return this.nimbu.post(`/customers/customizations?replace=1`, options)
  }

  private askOverwrite(ctx: any, task: any) {
    return new Observable((observer) => {
      let buffer = ''

      const outputStream: any = through((data) => {
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
        message: `Are you sure you want to overwrite the existing customizations?`,
        default: false,
      })
        .then((answer) => {
          // Clear the output
          observer.next()

          if (answer.overwrite) {
            return this.update(ctx, task)
          } else {
            task.skip(`Skipping update customer customizations ${ctx.toSite}`)
          }
        })
        .then(() => {
          observer.complete()
        })
        .catch((err) => {
          observer.error(err)
        })

      return outputStream
    })
  }
}
