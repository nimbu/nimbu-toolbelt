import Command from '../../command'

export default class ThemesDiff extends Command {
  static description = 'describe the command here'

  static flags = {}

  static args = [
    {
      name: 'theme',
      description: 'The name of the theme to list',
    },
  ]

  async run() {
    // don't parse, then this.argv is the original arguments (including flags)
    //await run('themes:diff', this.argv)
  }
}
