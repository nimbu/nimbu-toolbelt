import Command from '@nimbu-cli/command'
import proxy from '../../nimbu-gem/command'

export default class ThemesList extends Command {
  static description = 'list all layouts, templates and assets'

  static args = [
    {
      name: 'theme',
      description: 'The name of the theme to list',
    },
  ]

  async execute() {
    await this.nimbu.validateLogin()

    if (this.nimbu.token !== undefined) {
      // don't parse, then this.argv is the original arguments (including flags)
      await proxy(this.nimbuConfig.site!, this.nimbu.token, 'themes:list', this.argv)
    }
  }
}
