import Command from '@nimbu-cli/command'
import { Args } from '@oclif/core'
import proxy from '../../nimbu-gem/command'

export default class ThemesDiff extends Command {
  static description = 'describe the command here'

  static flags = {}

  static args = {
    theme: Args.string({
      name: 'theme',
      description: 'The name of the theme to list',
    }),
  }

  async execute() {
    await this.nimbu.validateLogin()

    if (this.nimbu.token !== undefined) {
      // don't parse, then this.argv is the original arguments (including flags)
      await proxy(this.nimbuConfig.site!, this.nimbu.token, 'themes:diff', this.argv)
    }
  }
}
