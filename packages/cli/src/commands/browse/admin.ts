import Command from '@nimbu-cli/command'
import { CliUx } from '@oclif/core'

export default class BrowseAdmin extends Command {
  static description = 'open the admin area for your current site'

  async execute() {
    await CliUx.ux.open(`https://${this.nimbuConfig.site}.${this.nimbuConfig.host}/admin`)
  }
}
