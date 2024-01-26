import { Command, APITypes as Nimbu, color } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'

export default class Login extends Command {
  static aliases = ['login']
  static description = 'login with your nimbu credentials'
  static flags = {
    'expires-in': Flags.integer({ char: 'e', description: 'duration of token in seconds (default 1 year)' }),
  }

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    const { flags } = await this.parse(Login)

    await this.nimbu.login({ expiresIn: flags['expires-in'] })
    const account = await this.nimbu.get<Nimbu.User>('/user', { retryAuth: false })
    this.log(`Logged in as ${color.green(account.email)}`)
    await this.config.runHook('recache', { type: 'login' })
  }
}
