import Command from '../../command'
import cli from 'cli-ux'

export default class BrowseAdmin extends Command {
  static description = 'open the admin area for your current site'

  async execute() {
    await cli.open(`https://${this.nimbuConfig.site}.${this.nimbuConfig.host}/admin`)
  }
}
