import { Interfaces, ux } from '@oclif/core'
import { pathExistsSync, readFileSync } from 'fs-extra'
import { default as Netrc } from 'netrc-parser'
import { HTTPError, default as Nimbu } from 'nimbu-client'
import * as os from 'node:os'
import urlencode from 'urlencode'

import { APIError, default as Client } from './client'

const debug = require('debug')('nimbu')
const hostname = os.hostname()

export interface CredentialsOptions {
  autoLogout?: boolean
  expiresIn?: number
}

interface NetrcEntry {
  login: string
  password: string
}

export class Credentials {
  private _auth?: string
  private readonly config: Interfaces.Config
  private readonly nimbu: Client

  constructor(config: Interfaces.Config, nimbu: Client) {
    this.config = config
    this.nimbu = nimbu
  }

  get token(): string | undefined {
    const host = this.nimbu.config.apiHost

    if (!this._auth) {
      this._auth = process.env.NIMBU_API_KEY
      if (!this._auth) {
        Netrc.loadSync()

        if (Netrc.machines[host] && Netrc.machines[host].token !== undefined) {
          Netrc.machines[host].password = Netrc.machines[host].token
          delete Netrc.machines[host].token
          Netrc.saveSync()
        }

        this._auth = Netrc.machines[host] && Netrc.machines[host].password
      }

      if (!this._auth) {
        this._auth = this.migrateFromNimbuToken()
      }
    }

    return this._auth
  }

  async login(opts?: CredentialsOptions): Promise<void> {
    opts = opts || { autoLogout: true }
    const host = this.nimbu.config.apiHost
    let loggedIn = false
    try {
      // timeout after 10 minutes
      setTimeout(() => {
        if (!loggedIn) {
          ux.error('timed out')
        }
      }, 1000 * 60 * 10).unref()

      if (process.env.NIMBU_API_KEY) {
        ux.error('Cannot log in with NIMBU_API_KEY set')
      }

      await Netrc.load()
      const previousToken = Netrc.machines[host]
      try {
        if (previousToken && previousToken.password && opts.autoLogout) {
          await this.logout(previousToken.password)

          delete Netrc.machines[host]
          Netrc.saveSync()
        }
      } catch (error) {
        if (error instanceof Error) {
          ux.warn(error)
        }
      }

      const auth = await this.interactive(previousToken && previousToken.login, opts.expiresIn)
      await this.saveToken(auth)
    } catch (error) {
      if (error instanceof HTTPError) {
        throw new APIError(error)
      }
    } finally {
      loggedIn = true
    }
  }

  async logout(token = this.nimbu.token) {
    if (!token) return debug('currently not logged in')

    return this.nimbu.post('/auth/logout', { retryAuth: false })
  }

  private async createOAuthToken(
    username: string,
    password: string,
    opts: { expiresIn?: number; secondFactor?: string } = {},
  ): Promise<NetrcEntry> {
    const auth = [username, password].join(':')
    const headers = {}

    if (opts.secondFactor) headers['X-Nimbu-Two-Factor'] = opts.secondFactor

    const client = new Nimbu({
      auth,
      host: this.nimbu.config.apiUrl,
      userAgent: this.config.userAgent,
    })

    const { token } = await client.post('/auth/login', {
      body: {
        description: `Nimbu CLI login from ${hostname}`,
        expires_in: opts.expiresIn || 60 * 60 * 24 * 365, // 1 year
      },
      headers,
    })

    return { login: username, password: token }
  }

  private get credentialsFile(): string {
    if (this.nimbu.config.isDefaultHost) {
      return `${this.homeDirectory}/.nimbu/credentials`
    }

    return `${this.homeDirectory}/.nimbu/credentials.${urlencode(this.nimbu.config.apiHost)}`
  }

  private get homeDirectory(): string {
    return this.config.home
  }

  private async interactive(login?: string, expiresIn?: number): Promise<NetrcEntry> {
    process.stderr.write('nimbu: Please enter your login credentials\n')
    login = await ux.prompt('Email or username', { default: login })
    const password = await ux.prompt('Password', { type: 'hide' })

    let auth
    try {
      auth = await this.createOAuthToken(login, password, { expiresIn })
    } catch (error) {
      if (error instanceof HTTPError && (!error.body || error.body.code !== 210)) throw error

      const secondFactor = await ux.prompt('Two-factor code', { type: 'mask' })
      auth = await this.createOAuthToken(login, password, { expiresIn, secondFactor })
    }

    this._auth = auth.password
    this.nimbu.refreshClient()
    return auth
  }

  private migrateFromNimbuToken(): string | undefined {
    let token

    const credentialsExist = pathExistsSync(this.credentialsFile)
    if (credentialsExist) {
      const credentials = readFileSync(this.credentialsFile).toString('utf8')
      const match = credentials.match(/^(bearer|oauth2|token) (\w+)$/i)
      if (match) {
        token = match[2]
      }
    }

    if (token) {
      Netrc.machines[this.nimbu.config.apiHost] = {}
      Netrc.machines[this.nimbu.config.apiHost].password = token
      Netrc.saveSync()
      return token
    }
  }

  private async saveToken(entry: NetrcEntry) {
    const host = this.nimbu.config.apiHost
    if (!Netrc.machines[host]) Netrc.machines[host] = {}

    Netrc.machines[host].login = entry.login
    Netrc.machines[host].password = entry.password

    delete Netrc.machines[host].method
    delete Netrc.machines[host].org

    if (Netrc.machines._tokens) {
      for (const token of (Netrc as any).machines._tokens) {
        if (host === token.host) {
          token.internalWhitespace = '\n  '
        }
      }
    }

    await Netrc.save()
  }
}
