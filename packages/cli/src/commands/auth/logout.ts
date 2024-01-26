import { Command } from '@nimbu-cli/command'
import { ux } from '@oclif/core'

export default class Logout extends Command {
  static aliases = ['logout']
  static description = 'clears local login credentials and invalidates API session'

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    ux.action.start('Logging out')
    await this.nimbu.logout()
  }
}
