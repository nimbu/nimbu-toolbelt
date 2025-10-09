import { Command } from '@nimbu-cli/command'

export default class BrowseAdmin extends Command {
  static description = 'open the admin area for your current site'

  async execute() {
    const { default: open } = await import('open')
    await open(`https://${this.nimbuConfig.site}.${this.nimbuConfig.host}/admin`)
  }
}
