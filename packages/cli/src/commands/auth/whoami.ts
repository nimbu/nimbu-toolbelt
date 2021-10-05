import Command from '../../command'
import * as Nimbu from '../../nimbu/types'
import { color } from '../../nimbu/color'

export default class Whoami extends Command {
  static description = 'display the current logged in user'
  static aliases = ['whoami']

  async execute() {
    if (process.env.NIMBU_API_KEY) this.warn('NIMBU_API_KEY is set')
    if (!this.nimbu.token) this.notloggedin()
    try {
      let { email, name } = await this.nimbu.get<Nimbu.User>('/user', { retryAuth: false })
      this.log(`Logged in as ${color.green(email!)} (${name})`)
    } catch (err) {
      if (err.statusCode === 401) this.notloggedin()
      throw err
    }
  }

  notloggedin() {
    this.error('not logged in', { exit: 100 })
  }
}
