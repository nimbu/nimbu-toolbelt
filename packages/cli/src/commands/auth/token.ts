import Command, { APITypes as Nimbu, color } from '@nimbu-cli/command'

import { Flags } from '@oclif/core'
import { formatRelative } from 'date-fns'

export default class Token extends Command {
  static description = `outputs current CLI authentication token.
By default, the CLI auth token is only valid for 1 year. To generate a long-lived token, use nimbu authorizations:create`

  static flags = {
    help: Flags.help({ char: 'h' }),
  }

  async execute() {
    this.parse(Token)

    if (!this.nimbu.token) this.error('not logged in')
    try {
      const tokens = await this.nimbu.get<Nimbu.Token[]>('/tokens', {
        retryAuth: false,
        fetchAll: true,
      })
      const token = tokens.find((t: any) => t.token && t.token === this.nimbu.token)
      if (token && token.expires_in) {
        const d = new Date()
        d.setSeconds(d.getSeconds() + token.expires_in)
        this.warn(
          `token will expire ${formatRelative(d, new Date())}\nUse ${color.cmd(
            'nimbu authorizations:create',
          )} to generate a long-term token`,
        )
      }
    } catch (err) {
      if (err instanceof Error) {
        this.warn(err.message)
      }
    }

    this.log(this.nimbu.token)
  }

  get needsConfig(): boolean {
    return false
  }
}
