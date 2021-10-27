import Command, { APIOptions, APIError } from '@nimbu-cli/command'
import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import { fetchAllChannels } from '../../utils/channels'
import { isCalculatedField, isRelationalField, isSelectField } from '../../nimbu/types'
const Listr = require('listr')

export default class ChannelsInfo extends Command {
  static description = 'list info about this channel'

  static args = [
    {
      name: 'channel',
      required: true,
      description: 'slug of your channel (optionally with the site, i.e. site/channel)',
    },
  ]

  static flags = {
    ...ux.table.flags(),
  }

  async execute() {
    const { args, flags } = this.parse(ChannelsInfo)

    const tty = !flags.csv && flags.output == null
    let channel: string
    let site: string | undefined

    let fromParts = args.channel.split('/')
    if (fromParts.length > 1) {
      site = fromParts[0]
      channel = fromParts[1]
    } else {
      site = this.nimbuConfig.site
      channel = fromParts[0]
    }

    if (site == null) {
      ux.error('You need to specify the source site.')
    }

    ux.action.start(`Fetching channel info from ${chalk.bold(site)}...`)

    const { channels, circularDependencies, graph } = await fetchAllChannels(this, site)

    ux.action.stop(chalk.green('✓'))

    const channelForInfo = channels.find((c) => c.slug === channel)

    if (channelForInfo == null) {
      ux.error(`Channel ${chalk.bold(channel)} can not be found on site ${chalk.bold(site)}`)
    }

    if (tty) {
      this.log(
        `\nChannel ${chalk.bold(channel)} (${chalk.bold(channelForInfo.name)} - ${channelForInfo.description}) has ${
          channelForInfo.customizations.length
        } fields.\n`,
      )
    }

    ux.table(
      channelForInfo.customizations,
      {
        label: {
          get: (row) => (tty && row.required ? row.label + '*' : row.label),
        },
        name: {},
        type: {},
        reference: {
          get: (row) => (isRelationalField(row) ? row.reference ?? '' : ''),
        },
        required: {
          get: (row) => (tty ? (row.required ? '✓' : '') : !!row.required),
        },
        options: {
          extended: true,
          get: (row) => {
            if (isSelectField(row)) {
              return row.select_options.map((o) => `${o.name} (${o.slug} / ${o.id})\n`).join('')
            } else {
              return ''
            }
          },
        },
        hint: {
          extended: true,
          get: (row) => row.hint ?? '',
        },
        calculated_expression: {
          extended: true,
          get: (row) => (isCalculatedField(row) ? row.calculated_expression ?? '' : ''),
        },
        required_expression: {
          extended: true,
          get: (row) => row.required_expression ?? '',
        },
        unique: {
          extended: true,
          get: (row) => (tty ? (row.unique ? '✓' : '') : !!row.unique),
        },
      },
      {
        printLine: this.log,
        ...flags, // parsed flags
      },
    )

    if (tty) {
      const dependants = graph.dependantsOf(channel)

      this.log(`\nThis channel has ${dependants.length} dependant channels: ${dependants.join(', ')}\n`)

      const tree = this.generateDependencyTree(channel, graph)
      this.log(channel)
      tree.display()
    }
  }

  private generateDependencyTree(currentChannel: string, graph: any, parents?: string[], tree?: any) {
    if (tree == null) {
      tree = ux.tree()
    }

    if (parents == null) {
      parents = []
    }

    parents.push(currentChannel)

    const directDependants = graph.directDependantsOf(currentChannel)
    for (const dependant of directDependants) {
      if (!parents.includes(dependant)) {
        parents.push(dependant)
        tree.insert(dependant)

        if (graph.directDependantsOf(dependant).length > 0) {
          const subtree = this.generateDependencyTree(dependant, graph, [...parents])
          tree.nodes[dependant] = subtree
        }
      }
    }

    return tree
  }
}
