import Command, { APIOptions, APIError } from '@nimbu-cli/command'
import Debug from 'debug'
import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import { Observable } from 'rxjs'
import { Channel, FieldType, RelationalField } from '../../nimbu/types'
import { fetchAllChannels } from '../../utils/channels'
const through = require('through')
const inquirer = require('inquirer')
const Listr = require('listr')

type CopyAll = {
  fromSite: string
  toSite: string
  channels?: Channel[]
  circularDependencies?: string[]
  overwrite: boolean
}

type CopyAllChannelsKnown = CopyAll & {
  channels: Channel[]
}

type CopySingle = {
  fromChannel: string
  toChannel: string
  fromSite: string
  toSite: string
  channel?: Channel
  overwrite: boolean
}

type CopySingleChannelKnown = CopySingle & {
  channel: Channel
  copyAll?: boolean
}

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
    force: flags.boolean({
      description: 'do not ask confirmation to overwrite existing channel',
    }),
    all: flags.boolean({
      char: 'a',
      description: 'copy all channels from source to target',
    }),
  }

  async execute() {
    const { flags } = this.parse(CopyChannels)

    const { channel: fromChannel, site: fromSite } = this.extractSiteAndChannel(flags.from, flags.all)
    const { channel: toChannel, site: toSite } = this.extractSiteAndChannel(flags.to, flags.all)

    if (fromSite === undefined) {
      ux.error('You need to specify the source site.')
    }

    if (toSite === undefined) {
      ux.error('You need to specify the destination site.')
    }

    if (fromChannel != null && toChannel != null) {
      await this.executeCopySingle({ fromSite, toSite, fromChannel, toChannel, overwrite: !!flags.force })
    } else {
      await this.executeCopyAll({ fromSite, toSite, overwrite: !!flags.force })
    }
  }

  private async executeCopySingle({ fromSite, toSite, fromChannel, toChannel }: CopySingle) {
    this.debug('Running executeCopySingle')

    let fetchTitle = `Fetching channel ${chalk.bold(fromChannel)} from site ${chalk.bold(fromSite)}`
    let upsertTitle = `Copying to channel ${chalk.bold(toChannel)} in site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        title: fetchTitle,
        task: (ctx: CopySingle) => this.fetch(ctx),
      },
      {
        title: upsertTitle,
        enabled: (ctx: CopySingle) => ctx.channel != null,
        task: (ctx: CopySingleChannelKnown, task) => this.copy(ctx, task),
      },
    ])

    await tasks
      .run({
        fromChannel,
        fromSite,
        toChannel,
        toSite,
      })
      .catch((error) => this.error(error))
  }

  private async executeCopyAll({ fromSite, toSite, overwrite }: CopyAll) {
    this.debug('Running executeCopyAll')

    let fetchTitle = `Fetching all channels from ${chalk.bold(fromSite)}`
    let upsertTitle = `Copying all channels to ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        title: fetchTitle,
        task: (ctx: CopyAll) => this.fetchAll(ctx),
      },
      {
        title: upsertTitle,
        enabled: (ctx: CopyAll) => ctx.channels != null && ctx.channels.length > 0,
        task: (ctx: CopyAllChannelsKnown, task) => {
          return new Listr([
            {
              title: 'Ensure circular dependencies are created first',
              enabled: (ctx: CopyAll) => ctx.circularDependencies != null && ctx.circularDependencies.length > 0,
              task: (ctx: CopyAll) => this.ensureCircularDependencies(ctx),
            },
            ...ctx.channels.map((channel) => ({
              title: `${chalk.bold(channel.name)} (${channel.slug})`,
              task: (ctx, task) =>
                this.copy(
                  {
                    fromChannel: channel.slug,
                    fromSite,
                    toChannel: channel.slug,
                    toSite,
                    channel: channel,
                    copyAll: true,
                    overwrite: overwrite,
                  },
                  task,
                ),
            })),
          ])
        },
      },
    ])

    await tasks
      .run({
        fromSite,
        toSite,
      })
      .catch((error) => this.error(error))
  }

  private extractSiteAndChannel(flag: string, copyAll?: boolean) {
    if (!!copyAll) return { site: flag }

    let channel: string
    let site: string | undefined

    let fromParts = flag.split('/')
    if (fromParts.length > 1) {
      site = fromParts[0]
      channel = fromParts[1]
    } else {
      site = this.nimbuConfig.site
      channel = fromParts[0]
    }

    return { channel, site }
  }

  private async fetch(ctx: any) {
    this.debug(`Fetching channel ${ctx.fromChannel} from ${ctx.fromSite}`)

    let options: APIOptions = { site: ctx.fromSite }

    try {
      ctx.channel = await this.nimbu.get<Channel>(`/channels/${ctx.fromChannel}`, options)
    } catch (error) {
      if (error instanceof APIError) {
        if (error.body != null && error.body.code === 101) {
          throw new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
        } else {
          throw new Error(error.message)
        }
      } else {
        throw error
      }
    }
  }

  private async fetchAll(ctx: CopyAll) {
    this.debug(`Fetching all channels from ${ctx.fromSite}`)

    const { channels, circularDependencies } = await fetchAllChannels(this, ctx.fromSite)

    ctx.channels = channels
    ctx.circularDependencies = circularDependencies
  }

  private async ensureCircularDependencies(ctx: CopyAll) {
    const circularDependencies = ctx.circularDependencies!

    const perform = async (observer) => {
      for (const slug of circularDependencies) {
        let targetChannel: any
        observer.next(slug)

        // check if target channel exists or not
        try {
          targetChannel = await this.nimbu.get<Channel>(`/channels/${slug}`, { site: ctx.toSite })
        } catch (error) {
          if (error instanceof APIError) {
            if (error.body === undefined || error.body.code !== 101) {
              throw new Error(error.message)
            }
          } else {
            throw error
          }
        }

        if (targetChannel == null) {
          // ensure a channel with this slug exists, any field will do
          await this.nimbu.post<Channel>(`/channels`, {
            site: ctx.toSite,
            body: {
              slug: slug,
              name: slug,
              customizations: [
                {
                  label: 'Dummy Field for Circular Dependencies',
                  name: 'dummy',
                  type: 'string',
                },
              ],
            },
          })
        }
      }
    }

    return new Observable((observer) => {
      perform(observer)
        .then(() => observer.complete())
        .catch((error) => observer.error(error))
    })
  }

  private async copy(ctx: CopySingleChannelKnown, task: any) {
    this.debug(`Copying channel ${ctx.fromSite}/${ctx.fromChannel} to ${ctx.toSite}/${ctx.toChannel}`)

    let options: APIOptions = { site: ctx.toSite }
    let targetChannel: any

    // check if target channel exists or not
    try {
      targetChannel = await this.nimbu.get<Channel>(`/channels/${ctx.toChannel}`, options)
    } catch (error) {
      if (error instanceof APIError) {
        if (error.body === undefined || error.body.code !== 101) {
          throw new Error(error.message)
        }
      } else {
        throw error
      }
    }

    if (targetChannel != null) {
      return this.askOverwrite(ctx, task)
    } else {
      return this.create(ctx, task)
    }
  }

  private async create(ctx: CopySingleChannelKnown, task: any) {
    this.debug(`Creating channel ${ctx.toSite}/${ctx.toChannel}`)

    let options: APIOptions = { site: ctx.toSite }

    ctx.channel.slug = ctx.toChannel
    options.body = ctx.channel

    if (ctx.copyAll) {
      task.title = `${chalk.bold(ctx.channel.name)} (${ctx.channel.slug}): created`
    } else {
      task.title = `Creating channel ${chalk.bold(ctx.toChannel)} in site ${chalk.bold(ctx.toSite)}`
    }

    await this.nimbu.post<Channel>(`/channels`, options)
  }

  private async update(ctx: CopySingleChannelKnown, task: any) {
    this.debug(`Updating channel ${ctx.toSite}/${ctx.toChannel}`)

    let options: APIOptions = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    ctx.channel.slug = ctx.toChannel
    options.body = ctx.channel

    if (ctx.copyAll) {
      task.title = `${chalk.bold(ctx.channel.name)} (${ctx.channel.slug}): updated`
    } else {
      task.title = `Updating channel ${chalk.bold(ctx.toChannel)} in site ${chalk.bold(ctx.toSite)}`
    }

    try {
      return this.nimbu.patch(`/channels/${ctx.toChannel}?replace=1`, options)
    } catch (error) {
      if (error instanceof APIError) {
        if (error.body === undefined || error.body.code !== 101) {
          throw new Error(JSON.stringify(error.message))
        } else {
          throw new Error(JSON.stringify(error))
        }
      } else {
        throw error
      }
    }
  }

  private askOverwrite(ctx: CopySingleChannelKnown, task: any) {
    this.debug(`Existing channel ${ctx.toSite}/${ctx.toChannel} found: asking for overwrite`)

    if (ctx.overwrite) {
      return this.update(ctx, task)
    }

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
