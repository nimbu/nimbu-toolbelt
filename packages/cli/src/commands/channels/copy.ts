import Command from '../../command'

import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import through from 'through'
import inquirer from 'inquirer'
import { Observable } from 'rxjs'

export default class CopyChannels extends Command {
  static description = 'copy channel configuration from one to another'

  static flags = {
    from: flags.string({
      char: 'f', // shorter flag version
      description: 'slug of the source channel',
      required: true,
    }),
    to: flags.string({
      char: 't', // shorter flag version
      description: 'slug of the target channel',
      required: true,
    }),
  }

  async execute() {
    const Listr = require('listr')
    const { flags } = this.parse(CopyChannels)

    let fromChannel: string
    let toChannel: string
    let fromSite: string | undefined
    let toSite: string | undefined

    let fromParts = flags.from.split('/')
    if (fromParts.length > 1) {
      fromSite = fromParts[0]
      fromChannel = fromParts[1]
    } else {
      fromSite = this.nimbuConfig.site
      fromChannel = fromParts[0]
    }
    let toParts = flags.to.split('/')
    if (toParts.length > 1) {
      toSite = toParts[0]
      toChannel = toParts[1]
    } else {
      toSite = this.nimbuConfig.site
      toChannel = toParts[0]
    }

    if (fromSite === undefined) {
      ux.error('You need to specify the source site.')
      return
    }

    if (toSite === undefined) {
      ux.error('You need to specify the destination site.')
      return
    }

    let fetchTitle = `Fetching channel ${chalk.bold(fromChannel)} from site ${chalk.bold(fromSite)}`
    let upsertTitle = `Copying to channel ${chalk.bold(toChannel)} in site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        title: fetchTitle,
        task: (ctx) => this.fetch(ctx),
      },
      {
        title: upsertTitle,
        enabled: (ctx) => ctx.channel != null,
        task: (ctx, task) => this.copy(ctx, task),
      },
    ])

    tasks
      .run({
        fromChannel,
        fromSite,
        toChannel,
        toSite,
      })
      .catch(() => {})
  }

  private async fetch(ctx: any) {
    let options: any = {}
    if (ctx.fromSite != null) {
      options.site = ctx.fromSite
    }
    try {
      ctx.channel = await this.nimbu.get(`/channels/${ctx.fromChannel}`, options)
    } catch (error) {
      if (error.body != null && error.body.code === 101) {
        throw new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
      } else {
        throw new Error(error.message)
      }
    }
  }

  private async copy(ctx: any, task: any) {
    let options: any = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    let targetChannel: any

    // check if target channel exists or not
    try {
      targetChannel = await this.nimbu.get(`/channels/${ctx.toChannel}`, options)
    } catch (error) {
      if (error.body === undefined || error.body.code !== 101) {
        throw new Error(error.message)
      }
    }

    if (targetChannel != null) {
      return this.askOverwrite(ctx, task)
    } else {
      return this.create(ctx, task)
    }
  }

  private async create(ctx: any, task: any) {
    let options: any = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    ctx.channel.slug = ctx.toChannel
    options.body = ctx.channel

    task.title = `Creating channel ${chalk.bold(ctx.toChannel)} in site ${chalk.bold(ctx.toSite)}`

    return this.nimbu.post(`/channels`, options)
  }

  private async update(ctx: any, task: any) {
    let options: any = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    ctx.channel.slug = ctx.toChannel
    options.body = ctx.channel

    task.title = `Updating channel ${chalk.bold(ctx.toChannel)} in site ${chalk.bold(ctx.toSite)}`
    try {
      return this.nimbu.patch(`/channels/${ctx.toChannel}?replace=1`, options)
    } catch (error) {
      if (error.body === undefined || error.body.code !== 101) {
        throw new Error(JSON.stringify(error.message))
      } else {
        throw new Error(JSON.stringify(error))
      }
    }
  }

  private askOverwrite(ctx: any, task: any) {
    return new Observable((observer) => {
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
        message: `channel ${chalk.bold(ctx.toChannel)} already exists. Update?`,
        default: false,
      })
        .then((answer) => {
          // Clear the output
          observer.next()

          if (answer.overwrite) {
            return this.update(ctx, task)
          } else {
            task.skip(`Skipping update channel ${ctx.toChannel}`)
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
