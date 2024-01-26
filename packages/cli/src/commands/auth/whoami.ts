import { Command, HTTPError, APITypes as Nimbu, color } from '@nimbu-cli/command'

export default class Whoami extends Command {
  static aliases = ['whoami']
  static description = 'display the current logged in user'

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    if (process.env.NIMBU_API_KEY) this.warn('NIMBU_API_KEY is set')
    if (!this.nimbu.token) this.notloggedin()
    try {
      const { email, name } = await this.nimbu.get<Nimbu.User>('/user', { retryAuth: false })
      this.log(`Logged in as ${color.green(email)} (${name})`)
    } catch (error) {
      if (error instanceof HTTPError) {
        if (error.statusCode === 401) this.notloggedin()
      } else {
        throw error
      }
    }
  }

  notloggedin() {
    this.error('not logged in', { exit: 100 })
  }
}
