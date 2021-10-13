import Command, { APITypes as Nimbu, color } from '@nimbu-cli/command'

import { flags } from '@oclif/command'

export default class Login extends Command {
  static description = 'login with your nimbu credentials'
  static aliases = ['login']
  static flags = {
    'expires-in': flags.integer({ char: 'e', description: 'duration of token in seconds (default 1 year)' }),
  }

  async execute() {
    const { flags } = await this.parse(Login)

    await this.nimbu.login({ expiresIn: flags['expires-in'] })
    const account = await this.nimbu.get<Nimbu.User>('/user', { retryAuth: false })
    this.log(`Logged in as ${color.green(account.email!)}`)
    await this.config.runHook('recache', { type: 'login' })
  }
}