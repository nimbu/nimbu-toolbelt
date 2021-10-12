import Command, { APIOptions, APIError } from '@nimbu-cli/command'
import Debug from 'debug'
import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import through from 'through'
import inquirer from 'inquirer'
import { Observable } from 'rxjs'
import { Channel, FieldType, RelationalField } from '../../nimbu/types'
const Listr = require('listr')

const debug = Debug('nimbu')

type CopyAll = {
  fromSite: string
  toSite: string
  channels?: Channel[]
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
      await this.executeCopySingle({ fromSite, toSite, fromChannel, toChannel })
    } else {
      await this.executeCopyAll({ fromSite, toSite })
    }
  }

  private async executeCopySingle({ fromSite, toSite, fromChannel, toChannel }: CopySingle) {
    debug('Running executeCopySingle')

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
      .catch(() => {})
  }

  private async executeCopyAll({ fromSite, toSite }: CopyAll) {
    debug('Running executeCopyAll')

    // const Listr = require('listr')

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
          return new Listr(
            ctx.channels.map((channel) => ({
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
                  },
                  task,
                ),
            })),
          )
        },
      },
    ])

    await tasks
      .run({
        fromSite,
        toSite,
      })
      .catch(() => {})
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
    debug(`Fetching channel ${ctx.fromChannel} from ${ctx.fromSite}`)

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
      }
    }
  }

  private async fetchAll(ctx: CopyAll) {
    debug(`Fetching all channels from ${ctx.fromSite}`)

    let options: APIOptions = { fetchAll: true, site: ctx.fromSite }

    try {
      let channels = await this.nimbu.get<Channel[]>(`/channels`, options)

      // determine dependencies between channels using a dependency graph
      let DependencyGraph = require('dependency-graph').DepGraph
      let graph = new DependencyGraph({ circular: true })

      // add all channels first
      const slugs: string[] = []
      channels.forEach((channel) => {
        graph.addNode(channel.slug)
        slugs.push(channel.slug)
      })

      // add dependencies
      channels.forEach((channel) => {
        const relationalFields = channel.customizations.filter(
          (field) => field.type === FieldType.BELONGS_TO || field.type === FieldType.BELONGS_TO_MANY,
        ) as RelationalField[]

        relationalFields.forEach((field) => {
          if (slugs.includes(field.reference)) graph.addDependency(channel.slug, field.reference)
        })
      })

      // get the order in which to insert / update channels
      const channelsInOrder = graph.overallOrder()

      // assign channels to context in this order
      ctx.channels = channelsInOrder.map((slug) => channels.find((c) => c.slug === slug))
    } catch (error) {
      if (error instanceof APIError) {
        if (error.body != null && error.body.code === 101) {
          throw new Error(`could not find site ${chalk.bold(ctx.fromSite)}`)
        } else {
          throw new Error(error.message)
        }
      }
    }
  }

  private async copy(ctx: CopySingleChannelKnown, task: any) {
    debug(`Copying channel ${ctx.fromSite}/${ctx.fromChannel} to ${ctx.toSite}/${ctx.toChannel}`)

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
      }
    }

    if (targetChannel != null) {
      return this.askOverwrite(ctx, task)
    } else {
      return this.create(ctx, task)
    }
  }

  private async create(ctx: CopySingleChannelKnown, task: any) {
    debug(`Creating channel ${ctx.toSite}/${ctx.toChannel}`)

    let options: APIOptions = { site: ctx.toSite }

    ctx.channel.slug = ctx.toChannel
    options.body = ctx.channel

    if (ctx.copyAll) {
      task.title = `Creating channel ${chalk.bold(ctx.toChannel)}`
    } else {
      task.title = `Creating channel ${chalk.bold(ctx.toChannel)} in site ${chalk.bold(ctx.toSite)}`
    }

    await this.nimbu.post<Channel>(`/channels`, options)
  }

  private async update(ctx: CopySingleChannelKnown, task: any) {
    debug(`Updating channel ${ctx.toSite}/${ctx.toChannel}`)

    let options: APIOptions = {}
    if (ctx.toSite != null) {
      options.site = ctx.toSite
    }

    ctx.channel.slug = ctx.toChannel
    options.body = ctx.channel

    if (ctx.copyAll) {
      task.title = `Updating channel ${chalk.bold(ctx.toChannel)}`
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
      }
    }
  }

  private askOverwrite(ctx: CopySingleChannelKnown, task: any) {
    debug(`Existing channel ${ctx.toSite}/${ctx.toChannel} found: asking for overwrite`)

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
