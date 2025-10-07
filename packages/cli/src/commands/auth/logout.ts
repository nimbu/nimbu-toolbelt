import { Command, ux } from '@nimbu-cli/command'

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
