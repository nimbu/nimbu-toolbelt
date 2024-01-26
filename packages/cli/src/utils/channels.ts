import { APIError, APIOptions, Command } from '@nimbu-cli/command'
import chalk from 'chalk'

import { Channel, isRelationalField } from '../nimbu/types'

type FetchChannelOptions = {
  includeBuiltIns?: boolean
}

export const fetchAllChannels = async (command: Command, site: string, options: FetchChannelOptions = {}) => {
  const apiOptions: APIOptions = { fetchAll: true, site }

  try {
    const channels: Channel[] = await command.nimbu.get<Channel[]>(`/channels`, apiOptions)

    // determine dependencies between channels using a dependency graphprefer-module
    const DependencyGraph = require('dependency-graph').DepGraph
    const graph = new DependencyGraph({ circular: true })

    // add all channels first
    const slugs: string[] = []
    for (const channel of channels) {
      graph.addNode(channel.slug)
      slugs.push(channel.slug)
    }

    if (options.includeBuiltIns) {
      for (const slug of ['articles', 'customers', 'orders', 'products']) {
        graph.addNode(slug)
        slugs.push(slug)
      }
    }

    // add dependencies
    for (const channel of channels) {
      const relationalFields = channel.customizations.filter(isRelationalField)

      for (const field of relationalFields) {
        if (slugs.includes(field.reference)) graph.addDependency(channel.slug, field.reference)
      }
    }

    // get the order in which to insert / update channels
    const channelsInOrder: string[] = graph.overallOrder()

    // search for circular dependencies
    const circularDependencies: string[] = []
    for (const slug of channelsInOrder) {
      const transientDeps = graph.dependenciesOf(slug)
      for (const dependency of transientDeps) {
        if (graph.dependenciesOf(dependency).includes(slug)) {
          // we found a circular dependency
          circularDependencies.push(slug)
        }
      }
    }

    // assign channels to context in this order
    const sortedChannels = channelsInOrder
      .map((slug) => channels.find((c) => c.slug === slug))
      .filter((channel) => channel != null) as Channel[]

    return { channels: sortedChannels, circularDependencies, graph }
  } catch (error) {
    if (error instanceof APIError) {
      const error_ =
        error.body != null && error.body.code === 101
          ? new Error(`could not find site ${chalk.bold(site)}`)
          : new Error(error.message)
      throw error_
    } else {
      throw error
    }
  }
}
