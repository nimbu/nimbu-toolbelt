import Command from '../../command'

import ux from 'cli-ux'

export default class Logout extends Command {
  static description = 'clears local login credentials and invalidates API session'
  static aliases = ['logout']

  async execute() {
    ux.action.start('Logging out')
    await this.nimbu.logout()
  }
}
