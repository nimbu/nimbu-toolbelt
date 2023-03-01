import Command from '@nimbu-cli/command'
import open from 'open'

export default class BrowseAdmin extends Command {
  static description = 'open the admin area for your current site'

  async execute() {
    await open(`https://${this.nimbuConfig.site}.${this.nimbuConfig.host}/admin`)
  }
}
