import { Command } from '@nimbu-cli/command'
import { Args } from '@oclif/core'

// TODO: Reimplement without Ruby gem dependency
// import proxy from '../../nimbu-gem/command'

export default class ThemesList extends Command {
  static args = {
    theme: Args.string({
      description: 'The name of the theme to list',
      name: 'theme',
    }),
  }

  static description = 'list all layouts, templates and assets (TODO: reimplement)'

  async execute() {
    this.error('themes:list command needs to be reimplemented without Ruby gem dependency')
    // TODO: Reimplement this command to use the Node.js proxy server
  }
}
