import Command from '../../command'
import * as Nimbu from '../../nimbu/types'
import { color } from '../../nimbu/color'

import { flags } from '@oclif/command'
import { formatRelative } from 'date-fns'

export default class Token extends Command {
  static description = `outputs current CLI authentication token.
By default, the CLI auth token is only valid for 1 year. To generate a long-lived token, use nimbu authorizations:create`

  static flags = {
    help: flags.help({ char: 'h' }),
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
      this.warn(err)
    }

    this.log(this.nimbu.token)
  }
}
