import { Command } from '@nimbu-cli/command'
import { Args } from '@oclif/core'

import proxy from '../../nimbu-gem/command'

export default class ThemesDiff extends Command {
  static args = {
    theme: Args.string({
      description: 'The name of the theme to list',
      name: 'theme',
    }),
  }

  static description = 'describe the command here'

  static flags = {}

  async execute() {
    await this.nimbu.validateLogin()

    if (this.nimbu.token !== undefined) {
      if (this.nimbuConfig.site == null) {
        this.error('No site configured')
      }

      // don't parse, then this.argv is the original arguments (including flags)
      await proxy(this.nimbuConfig.site, this.nimbu.token, 'themes:diff', this.argv)
    }
  }
}
