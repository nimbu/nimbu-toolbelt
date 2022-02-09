import Command from '@nimbu-cli/command'
import { CliUx } from '@oclif/core'

export default class Logout extends Command {
  static description = 'clears local login credentials and invalidates API session'
  static aliases = ['logout']

  async execute() {
    CliUx.ux.action.start('Logging out')
    await this.nimbu.logout()
  }
}
