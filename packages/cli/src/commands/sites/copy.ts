import Command from '@nimbu-cli/command'
import Debug from 'debug'
import { flags } from '@oclif/command'
import ux from 'cli-ux'
import chalk from 'chalk'

import CopyChannels from '../channels/copy'
import CopyThemes from '../themes/copy'
import CopyTranslations from '../translations/copy'
import CopyPages from '../pages/copy'
import CopyMenus from '../menus/copy'
import CopyCustomerConfig from '../customers/config/copy'
import CopyProductsConfig from '../products/config/copy'

const Listr = require('listr')

export default class CopySite extends Command {
  static description = 'copy a complete site from one to another'

  static flags = {
    from: flags.string({
      char: 'f', // shorter flag version
      description: 'subdomain of the source site',
    }),
    to: flags.string({
      char: 't', // shorter flag version
      description: 'subdomain of the destination site',
    }),
    force: flags.boolean({
      description: 'do not ask confirmation to overwrite existing channel',
    }),
  }

  async execute() {
    const { flags } = this.parse(CopySite)

    let fromSite = flags.from !== undefined ? flags.from! : this.nimbuConfig.site!
    let toSite = flags.to !== undefined ? flags.to! : this.nimbuConfig.site!

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
    }

    this.log(`Copying everything from ${chalk.bold(fromSite)} to ${chalk.bold(toSite)}:\n`)

    await CopyCustomerConfig.run(['--from', fromSite, '--to', toSite])
    await CopyProductsConfig.run(['--from', fromSite, '--to', toSite])
    await CopyChannels.run(['--from', fromSite, '--to', toSite, '--all'].concat(flags.force ? ['--force'] : []))
    await CopyThemes.run(['--from', fromSite, '--to', toSite])
    await CopyPages.run(['--from', fromSite, '--to', toSite])
    await CopyMenus.run(['--from', fromSite, '--to', toSite])
    await CopyTranslations.run(['--from', fromSite, '--to', toSite])
  }
}
