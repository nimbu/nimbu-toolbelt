import Command from '@nimbu-cli/command'

import { ux, Flags } from '@oclif/core'
import chalk from 'chalk'

import CopyChannels from '../channels/copy'
import CopyThemes from '../themes/copy'
import CopyTranslations from '../translations/copy'
import CopyPages from '../pages/copy'
import CopyMenus from '../menus/copy'
import CopyCustomerConfig from '../customers/config/copy'
import CopyProductsConfig from '../products/config/copy'
import CopyChannelEntries from '../channels/entries/copy'

const Listr = require('listr')

export default class CopySite extends Command {
  static description = 'copy a complete site from one to another'

  static flags = {
    from: Flags.string({
      char: 'f', // shorter flag version
      description: 'subdomain of the source site',
    }),
    to: Flags.string({
      char: 't', // shorter flag version
      description: 'subdomain of the destination site',
    }),
    force: Flags.boolean({
      description: 'do not ask confirmation to overwrite existing channel',
    }),
    include: Flags.string({
      char: 'i',
      description: 'channels from which entities should be copied',
    }),
    recursive: Flags.boolean({
      description: 'recursively copy child entities referenced by the entities to be copied',
    }),
    upsert: Flags.string({
      char: 'u',
      description: 'name of parameter to use for matching existing documents',
    }),
    only: Flags.string({
      description: 'limit copy of channels to this list (comma-separated) when using recursive',
    }),
    'copy-customers': Flags.boolean({
      description: 'copy and replicate all owners related to the objects we are copying',
    }),
    'allow-errors': Flags.boolean({
      description: 'do not stop when an item fails and continue with the other',
    }),
  }

  async execute() {
    const { flags } = await this.parse(CopySite)

    let fromSite = flags.from !== undefined ? flags.from! : this.nimbuConfig.site!
    let toSite = flags.to !== undefined ? flags.to! : this.nimbuConfig.site!

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
    }

    const channelsWithEntriesToCopy = flags.include !== undefined ? flags.include!.split(',') : []

    this.log(`Copying everything from ${chalk.bold(fromSite)} to ${chalk.bold(toSite)}:`)

    this.log(`\n1. Copying channels...\n`)
    await CopyChannels.run(['--from', fromSite, '--to', toSite, '--all'].concat(flags.force ? ['--force'] : []))

    if (channelsWithEntriesToCopy.length > 0) {
      for (const channel of channelsWithEntriesToCopy) {
        this.log(`\n  --> Copying entries for channel ${chalk.bold(channel)}...\n`)
        let flagsForSubcommand = ['--from', `${fromSite}/${channel}`, '--to', `${toSite}/${channel}`]
        if (flags.recursive) {
          flagsForSubcommand.push('--recursive')
        }
        if (flags.only) {
          flagsForSubcommand.push('--only', flags.only)
        }
        if (flags.upsert) {
          flagsForSubcommand.push('--only', flags.upsert)
        }
        if (flags['copy-customers']) {
          flagsForSubcommand.push('--copy-customers')
        }
        if (flags['allow-errors']) {
          flagsForSubcommand.push('--allow-errors')
        }
        await CopyChannelEntries.run(flagsForSubcommand)
      }
    }

    this.log(`\n2. Customer data model...\n`)
    await CopyCustomerConfig.run(['--from', fromSite, '--to', toSite])

    this.log(`\n3. Product data model...\n`)
    await CopyProductsConfig.run(['--from', fromSite, '--to', toSite])

    this.log(`\n4. Active themes...\n`)
    await CopyThemes.run(['--from', fromSite, '--to', toSite])

    this.log(`\n5. Pages...\n`)
    await CopyPages.run(['--from', fromSite, '--to', toSite])

    this.log(`\n6. Menus...\n`)
    await CopyMenus.run(['--from', fromSite, '--to', toSite])

    this.log(`\n7. Translations...\n`)
    await CopyTranslations.run(['--from', fromSite, '--to', toSite])

    this.log('\n✨  Done! ✨')
  }

  get needsConfig(): boolean {
    return false
  }
}
