import { APIError, Command } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import { detailedDiff } from 'deep-object-diff'

import { addFieldNames, cleanUpIds, convertChangesToTree } from '../../utils/diff'

export default class DiffChannels extends Command {
  static description = 'check differences between channel settings from one to another'

  static flags = {
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
    const { flags } = await this.parse(DiffChannels)

    let fromChannel: string
    // let toChannel: string
    let fromSite: string | undefined

    const fromParts = flags.from.split('/')
    if (fromParts.length > 1) {
      fromSite = fromParts[0]
      fromChannel = fromParts[1]
    } else {
      fromSite = this.nimbuConfig.site
      fromChannel = fromParts[0]
    }

    const toParts = flags.to.split('/')
    const toSite = toParts.length > 1 ? toParts[0] : this.nimbuConfig.site

    if (fromSite == null) {
      ux.error('You need to specify the source site.')
      return
    }

    if (toSite == null) {
      ux.error('You need to specify the destination site.')
      return
    }

    let query = ''
    let description = ''

    if (fromChannel !== '*' && !fromChannel.includes('*')) {
      query = `?slug=${fromChannel}`
      description = `channel ${chalk.bold(fromChannel)}`
    } else if (fromChannel !== '*' && fromChannel.includes('*')) {
      query = `?slug.start=${fromChannel}`
      description = `channel where slug starts with ${chalk.bold(fromChannel.replace('*', '..'))}`
    } else {
      description = `${chalk.bold('all channels')}`
    }

    ux.action.start(`Fetching ${description} from site ${chalk.bold(fromSite)}`)

    const options = {
      fetchAll: true,
      site: fromSite,
    }

    const channelSummaries: any = await this.nimbu.get(`/channels${query}`, options)
    ux.action.stop()

    for (const channel of channelSummaries) {
      ux.action.start(`Comparing channel ${chalk.green(chalk.bold(channel.slug))}`)

      let detailedFrom: any
      let detailedTo: any

      try {
        detailedFrom = await this.nimbu.get(`/channels/${channel.slug}`, { site: fromSite })
      } catch (error) {
        if (error instanceof APIError) {
          if (error.body === undefined || error.body.code !== 101) {
            throw new Error(error.message)
          }
        } else {
          throw error
        }
      }

      try {
        detailedTo = await this.nimbu.get(`/channels/${channel.slug}`, { site: toSite })
      } catch (error) {
        if (error instanceof APIError) {
          if (error.body === undefined || error.body.code !== 101) {
            throw new Error(error.message)
          }
        } else {
          throw error
        }
      }

      ux.action.stop()

      if (detailedTo == null) {
        ux.info(`Channel  ${chalk.bold(channel.slug)} is missing in site ${chalk.bold(toSite)}`)
      } else {
        this.cleanUpBeforeDiff(detailedFrom)
        this.cleanUpBeforeDiff(detailedTo)

        const fromCustomizations = detailedFrom.customizations
        const toCustomizations = detailedTo.customizations
        delete detailedFrom.customizations
        delete detailedTo.customizations

        const diff: any = detailedDiff(fromCustomizations, toCustomizations)
        const otherDiff: any = detailedDiff(detailedFrom, detailedTo)
        let anyDifferences = false

        addFieldNames(diff, fromCustomizations, toCustomizations)

        ux.log('')
        if (diff.added != null && Object.keys(diff.added).length > 0) {
          anyDifferences = true
          ux.log(`Following fields or field attributes are present in ${chalk.bold(toSite)}, but not ${fromSite}:`)
          convertChangesToTree(diff.added).display()
        }

        if (diff.deleted != null && Object.keys(diff.deleted).length > 0) {
          anyDifferences = true
          ux.log(`Following fields or field attributes are present in ${chalk.bold(fromSite)}, but not ${toSite}:`)
          convertChangesToTree(diff.deleted).display()
        }

        if (diff.updated != null && Object.keys(diff.updated).length > 0) {
          anyDifferences = true
          ux.log(`Following fields or field attributes have differences:`)
          convertChangesToTree(diff.updated).display()
        }

        ux.log('')
        if (otherDiff.added != null && Object.keys(otherDiff.added).length > 0) {
          anyDifferences = true
          ux.log(`Following channel attributes are present in ${chalk.bold(toSite)}, but not ${fromSite}:`)
          convertChangesToTree(otherDiff.added).display()
        }

        if (otherDiff.deleted != null && Object.keys(otherDiff.deleted).length > 0) {
          anyDifferences = true
          ux.log(`Following channel attributes are present in ${chalk.bold(fromSite)}, but not ${toSite}:`)
          convertChangesToTree(otherDiff.deleted).display()
        }

        if (otherDiff.updated != null && Object.keys(otherDiff.updated).length > 0) {
          anyDifferences = true
          ux.log(`Following channel attributes have differences:`)
          convertChangesToTree(otherDiff.updated).display()
        }

        if (!anyDifferences) {
          ux.log(`There are no differences.`)
        }
      }

      ux.info(chalk.dim('===========================================================================\n'))
    }
  }

  private cleanUpBeforeDiff(data) {
    cleanUpIds(data)

    for (const field of data.customizations) {
      cleanUpIds(field)

      if (field.select_options != null) {
        for (const option of field.select_options) {
          cleanUpIds(option)
        }
      }
    }
  }

  private extractCustomizations(diff) {
    const fieldDiff: any = {}
    const otherDiff: any = {}

    if (diff.added != null && diff.added.customizations != null) {
      fieldDiff.added = diff.added.customizations
      delete diff.added.customizations
      otherDiff.added = diff.added
    }

    if (diff.deleted != null && diff.deleted.customizations != null) {
      fieldDiff.deleted = diff.deleted.customizations
      delete diff.deleted.customizations
      otherDiff.deleted = diff.deleted
    }

    if (diff.updated != null && diff.updated.customizations != null) {
      fieldDiff.updated = diff.updated.customizations
      delete diff.updated.customizations
      otherDiff.updated = diff.updated
    }

    return { fieldDiff, otherDiff }
  }
}
