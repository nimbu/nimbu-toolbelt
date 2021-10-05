import Command from '../../../command'
import { convertChangesToTree, addFieldNames, cleanUpIds } from '../../../utils/diff'

import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'
import { detailedDiff } from 'deep-object-diff'

export default class ProductsConfigDiff extends Command {
  static description = 'check differences between product customizations from one to another'

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
    const { flags } = this.parse(ProductsConfigDiff)

    let fromSite = flags.from!
    let toSite = flags.to!

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
      return
    }

    ux.action.start(`Fetching product customizations from site ${chalk.bold(fromSite)}`)
    let detailedFrom = []
    let detailedTo = []

    try {
      detailedFrom = await this.nimbu.get(`/products/customizations`, {
        fetchAll: true,
        site: fromSite,
      })
    } catch (error) {
      ux.action.stop()
      throw new Error(error.message)
    }

    try {
      detailedTo = await this.nimbu.get(`/products/customizations`, {
        fetchAll: true,
        site: toSite,
      })
    } catch (error) {
      ux.action.stop()
      throw new Error(error.message)
    }

    ux.action.stop()

    this.cleanUpBeforeDiff(detailedFrom)
    this.cleanUpBeforeDiff(detailedTo)

    let diff: any = detailedDiff(detailedFrom, detailedTo)
    let anyDifferences = false
    addFieldNames(diff, detailedFrom, detailedTo)
    ux.log('')
    if (diff.added != null && Object.keys(diff.added).length > 0) {
      anyDifferences = true
      ux.log(`Following fields are present in ${chalk.bold(toSite)}, but not ${fromSite}:`)
      convertChangesToTree(diff.added).display()
    }

    if (diff.deleted != null && Object.keys(diff.deleted).length > 0) {
      anyDifferences = true
      ux.log(`Following fields are present in ${chalk.bold(fromSite)}, but not ${toSite}:`)
      convertChangesToTree(diff.deleted).display()
    }

    if (diff.updated != null && Object.keys(diff.updated).length > 0) {
      anyDifferences = true
      ux.log(`Following fields have differences:`)
      convertChangesToTree(diff.updated).display()
    }

    if (!anyDifferences) {
      ux.log(`There are no differences.`)
    }
  }

  private cleanUpBeforeDiff(data) {
    for (let field of data) {
      cleanUpIds(field)

      if (field.select_options != null) {
        for (let option of field.select_options) {
          cleanUpIds(option)
        }
      }
    }
  }
}
