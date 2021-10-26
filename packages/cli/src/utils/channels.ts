import Command, { APIOptions, APIError } from '@nimbu-cli/command'
import { Channel, isRelationalField } from '../nimbu/types'
import chalk from 'chalk'

export const fetchAllChannels = async (command: Command, site: string) => {
  let options: APIOptions = { fetchAll: true, site }

  try {
    let channels: Channel[] = await command.nimbu.get<Channel[]>(`/channels`, options)

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
      const relationalFields = channel.customizations.filter(isRelationalField)

      relationalFields.forEach((field) => {
        if (slugs.includes(field.reference)) graph.addDependency(channel.slug, field.reference)
      })
    })

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
    let sortedChannels = channelsInOrder
      .map((slug) => channels.find((c) => c.slug === slug))
      .filter((channel) => channel != null) as Channel[]

    return { channels: sortedChannels, circularDependencies }
  } catch (error) {
    if (error instanceof APIError) {
      if (error.body != null && error.body.code === 101) {
        throw new Error(`could not find site ${chalk.bold(site)}`)
      } else {
        throw new Error(error.message)
      }
    } else {
      throw error
    }
  }
}
