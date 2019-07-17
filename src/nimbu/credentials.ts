import { IConfig } from '@oclif/config'
import ux from 'cli-ux'
import { readFileSync, pathExistsSync } from 'fs-extra'
import urlencode from 'urlencode'
import Netrc from 'netrc-parser'
import Nimbu from 'nimbu-client'
import * as os from 'os'

import Config from './config'
import { default as Client, APIError } from './client'

const debug = require('debug')('nimbu-toolbelt')
const hostname = os.hostname()

export namespace Credentials {
  export interface Options {
    expiresIn?: number
  }
}

interface NetrcEntry {
  login: string
  token: string
}

export class Credentials {
  private readonly config: IConfig
  private readonly nimbu: Client
  private _auth?: string

  constructor(config: IConfig, nimbu: Client) {
    this.config = config
    this.nimbu = nimbu
  }

  private get homeDirectory(): string {
    return this.config.home
  }

  private get credentialsFile(): string {
    if (Config.isDefaultHost) {
      return `${this.homeDirectory}/.nimbu/credentials`
    } else {
      return `${this.homeDirectory}/.nimbu/credentials.${urlencode(Config.apiHost)}`
    }
  }

  get token(): string | undefined {
    const host = Config.apiHost

    if (!this._auth) {
      this._auth = process.env.NIMBU_API_KEY
      if (!this._auth) {
        Netrc.loadSync()
        this._auth = Netrc.machines[host] && Netrc.machines[host].token
      }
      if (!this._auth) {
        this._auth = this.migrateFromNimbuToken()
      }
    }
    return this._auth
  }

  async login(opts: Credentials.Options = {}): Promise<void> {
    const host = Config.apiHost
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
        if (previousToken && previousToken.token) await this.logout(previousToken.token)
      } catch (err) {
        ux.warn(err)
      }
      let auth = await this.interactive(previousToken && previousToken.login, opts.expiresIn)
      await this.saveToken(auth)
    } catch (err) {
      throw new APIError(err)
    } finally {
      loggedIn = true
    }
  }

  async logout(token = this.nimbu.token) {
    if (!token) return debug('currently not logged in')

    return this.nimbu.post('/auth/logout')
  }

  private async interactive(login?: string, expiresIn?: number): Promise<NetrcEntry> {
    process.stderr.write('nimbu: Please enter your login credentials\n')
    login = await ux.prompt('Email or username', { default: login })
    let password = await ux.prompt('Password', { type: 'hide' })

    let auth
    try {
      auth = await this.createOAuthToken(login!, password, { expiresIn })
    } catch (err) {
      if (!err.body || err.body.code !== 'two_factor') throw err
      let secondFactor = await ux.prompt('Two-factor code', { type: 'mask' })
      auth = await this.createOAuthToken(login!, password, { expiresIn, secondFactor })
    }
    this._auth = auth.token
    this.nimbu.refreshClient()
    return auth
  }

  private async createOAuthToken(
    username: string,
    password: string,
    opts: { expiresIn?: number; secondFactor?: string } = {},
  ): Promise<NetrcEntry> {
    let auth = [username, password].join(':')
    let headers = {}

    if (opts.secondFactor) headers['X-Nimbu-Two-Factor'] = opts.secondFactor

    let client = new Nimbu({
      auth,
      host: Config.apiUrl,
      userAgent: this.config.userAgent,
    })

    let { token } = await client.post('/auth/login', {
      headers,
      body: {
        description: `Nimbu CLI login from ${hostname}`,
        expires_in: opts.expiresIn || 60 * 60 * 24 * 365, // 1 year
      },
    })

    return { token, login: username }
  }

  private async saveToken(entry: NetrcEntry) {
    const host = Config.apiHost
    if (!Netrc.machines[host]) Netrc.machines[host] = {}

    Netrc.machines[host].token = entry.token
    Netrc.machines[host].login = entry.login

    delete Netrc.machines[host].method
    delete Netrc.machines[host].org

    if (Netrc.machines._tokens) {
      ;(Netrc.machines._tokens as any).forEach((token: any) => {
        if (host === token.host) {
          token.internalWhitespace = '\n  '
        }
      })
    }

    await Netrc.save()
  }

  private migrateFromNimbuToken(): string | undefined {
    let token

    const credentialsExist = pathExistsSync(this.credentialsFile)
    if (credentialsExist) {
      const credentials = readFileSync(this.credentialsFile).toString('utf-8')
      const match = credentials.match(/^(bearer|oauth2|token) ([\w]+)$/i)
      if (match) {
        token = match[2]
      }
    }
    if (token) {
      Netrc.machines[Config.apiHost] = {}
      Netrc.machines[Config.apiHost].token = token
      Netrc.saveSync()
      return token
    }
  }
}
