import { APIError, APIOptions, Command } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import inquirer from 'inquirer'
import Listr from 'listr'
import { Observable } from 'rxjs'
import through from 'through'

import { Channel } from '../../nimbu/types'
import { fetchAllChannels } from '../../utils/channels'

type CopyAll = {
  channels?: Channel[]
  circularDependencies?: string[]
  fromSite: string
  overwrite: boolean
  toSite: string
}

type CopyAllChannelsKnown = CopyAll & {
  channels: Channel[]
}

type CopySingle = {
  channel?: Channel
  fromChannel: string
  fromSite: string
  overwrite: boolean
  toChannel: string
  toSite: string
}

type CopySingleChannelKnown = CopySingle & {
  channel: Channel
  copyAll?: boolean
}

export default class CopyChannels extends Command {
  static description = 'copy channel configuration from one to another'

  static flags = {
    all: Flags.boolean({
      char: 'a',
      description: 'copy all channels from source to target',
    }),
    force: Flags.boolean({
      description: 'do not ask confirmation to overwrite existing channel',
    }),
    from: Flags.string({
      char: 'f', // shorter flag version
      description: 'slug of the source channel',
      required: true,
    }),
    to: Flags.string({
      char: 't', // shorter flag version
      description: 'slug of the target channel',
      required: true,
    }),
  }

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    const { flags } = await this.parse(CopyChannels)

    const { channel: fromChannel, site: fromSite } = this.extractSiteAndChannel(flags.from, flags.all)
    const { channel: toChannel, site: toSite } = this.extractSiteAndChannel(flags.to, flags.all)

    if (fromSite == null) {
      ux.error('You need to specify the source site.')
      return
    }

    if (toSite == null) {
      ux.error('You need to specify the destination site.')
      return
    }

    await (fromChannel != null && toChannel != null
      ? this.executeCopySingle({ fromChannel, fromSite, overwrite: Boolean(flags.force), toChannel, toSite })
      : this.executeCopyAll({ fromSite, overwrite: Boolean(flags.force), toSite }))
  }

  private askOverwrite(ctx: CopySingleChannelKnown, task: any) {
    this.debug(`Existing channel ${ctx.toSite}/${ctx.toChannel} found: asking for overwrite`)

    if (ctx.overwrite) {
      return this.update(ctx, task)
    }

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
        message: `channel ${chalk.bold(ctx.toChannel)} already exists. Update?`,
        name: 'overwrite',
        type: 'confirm',
      })
        .then((answer) => {
          // Clear the output
          observer.next()

          if (answer.overwrite) {
            return this.update(ctx, task)
          }

          task.skip(`Skipping update channel ${ctx.toChannel}`)
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

  private async copy(ctx: CopySingleChannelKnown, task: any) {
    this.debug(`Copying channel ${ctx.fromSite}/${ctx.fromChannel} to ${ctx.toSite}/${ctx.toChannel}`)

    const options: APIOptions = { site: ctx.toSite }
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
    }

    return this.create(ctx, task)
  }

  private async create(ctx: CopySingleChannelKnown, task: any) {
    this.debug(`Creating channel ${ctx.toSite}/${ctx.toChannel}`)

    const options: APIOptions = { site: ctx.toSite }

    ctx.channel.slug = ctx.toChannel
    options.body = ctx.channel

    task.title = ctx.copyAll
      ? `${chalk.bold(ctx.channel.name)} (${ctx.channel.slug}): created`
      : `Creating channel ${chalk.bold(ctx.toChannel)} in site ${chalk.bold(ctx.toSite)}`

    await this.nimbu.post<Channel>(`/channels`, options)
  }

  private async ensureCircularDependencies(ctx: CopyAll) {
    const circularDependencies = ctx.circularDependencies || []

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
            body: {
              customizations: [
                {
                  label: 'Dummy Field for Circular Dependencies',
                  name: 'dummy',
                  type: 'string',
                },
              ],
              name: slug,
              slug,
            },
            site: ctx.toSite,
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

  private async executeCopyAll({ fromSite, overwrite, toSite }: CopyAll) {
    this.debug('Running executeCopyAll')

    const fetchTitle = `Fetching all channels from ${chalk.bold(fromSite)}`
    const upsertTitle = `Copying all channels to ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        task: (ctx: CopyAll) => this.fetchAll(ctx),
        title: fetchTitle,
      },
      {
        enabled: (ctx: CopyAll) => ctx.channels != null && ctx.channels.length > 0,
        task: (ctx: CopyAllChannelsKnown, _task) =>
          new Listr([
            {
              enabled: (ctx: CopyAll) => ctx.circularDependencies != null && ctx.circularDependencies.length > 0,
              task: (ctx: CopyAll) => this.ensureCircularDependencies(ctx),
              title: 'Ensure circular dependencies are created first',
            },
            ...ctx.channels.map((channel) => ({
              task: (_ctx, task) =>
                this.copy(
                  {
                    channel,
                    copyAll: true,
                    fromChannel: channel.slug,
                    fromSite,
                    overwrite,
                    toChannel: channel.slug,
                    toSite,
                  },
                  task,
                ),
              title: `${chalk.bold(channel.name)} (${channel.slug})`,
            })),
          ]),
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

  private async executeCopySingle({ fromChannel, fromSite, toChannel, toSite }: CopySingle) {
    this.debug('Running executeCopySingle')

    const fetchTitle = `Fetching channel ${chalk.bold(fromChannel)} from site ${chalk.bold(fromSite)}`
    const upsertTitle = `Copying to channel ${chalk.bold(toChannel)} in site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        task: (ctx: CopySingle) => this.fetch(ctx),
        title: fetchTitle,
      },
      {
        enabled: (ctx: CopySingle) => ctx.channel != null,
        task: (ctx: CopySingleChannelKnown, task) => this.copy(ctx, task),
        title: upsertTitle,
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

  private extractSiteAndChannel(flag: string, copyAll?: boolean) {
    if (copyAll) return { site: flag }

    let channel: string
    let site: string | undefined

    const fromParts = flag.split('/')
    if (fromParts.length > 1) {
      site = fromParts[0]
      channel = fromParts[1]
    } else {
      site = this.nimbuConfig.site
      channel = fromParts[0]
    }

    if (site == null) {
      throw new Error('You need to specify the site.')
    }

    return { channel, site }
  }

  private async fetch(ctx: any) {
    this.debug(`Fetching channel ${ctx.fromChannel} from ${ctx.fromSite}`)

    const options: APIOptions = { site: ctx.fromSite }

    try {
      ctx.channel = await this.nimbu.get<Channel>(`/channels/${ctx.fromChannel}`, options)
    } catch (error) {
      if (error instanceof APIError) {
        const error_ =
          error.body != null && error.body.code === 101
            ? new Error(`could not find channel ${chalk.bold(ctx.fromChannel)}`)
            : new Error(error.message)
        throw error_
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

  private async update(ctx: CopySingleChannelKnown, task: any) {
    this.debug(`Updating channel ${ctx.toSite}/${ctx.toChannel}`)

    const options: APIOptions = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    ctx.channel.slug = ctx.toChannel
    options.body = ctx.channel

    task.title = ctx.copyAll
      ? `${chalk.bold(ctx.channel.name)} (${ctx.channel.slug}): updated`
      : `Updating channel ${chalk.bold(ctx.toChannel)} in site ${chalk.bold(ctx.toSite)}`

    try {
      return this.nimbu.patch(`/channels/${ctx.toChannel}?replace=1`, options)
    } catch (error) {
      if (error instanceof APIError) {
        const error_ =
          error.body === undefined || error.body.code !== 101
            ? new Error(JSON.stringify(error.message))
            : new Error(JSON.stringify(error))
        throw error_
      } else {
        throw error
      }
    }
  }
}
