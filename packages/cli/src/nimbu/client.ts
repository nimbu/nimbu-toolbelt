import { IConfig } from '@oclif/config'
import { CLIError } from '@oclif/errors'
import Netrc from 'netrc-parser'
import Nimbu from 'nimbu-client'
import ux from 'cli-ux'

import { Credentials } from './credentials'
import Config from './config'
import { User } from './types'

export namespace Client {
  export interface Options {
    retryAuth?: boolean
    fetchAll?: boolean
    headers?: any
    formData?: any
    site?: string
    host?: string
    body?: object
    auth?: string
  }
}

export interface IAPIErrorOptions {
  resource?: string
  site?: { id: string; name: string }
  message?: string
  code?: number
  errors?: string[]
}

interface HTTPError extends Error {
  body?: any
  statusCode?: number
}

export class APIError extends CLIError {
  http: HTTPError
  body: IAPIErrorOptions

  constructor(error: HTTPError) {
    if (!error) throw new Error('invalid error')
    let options: IAPIErrorOptions = error.body
    if (!options || options instanceof String || !options.message) throw error

    let info: string[] = []
    if (options.code) {
      info.push(`Error Code: ${options.code}`)
    }
    if (options.site && options.site.name) {
      info.push(`Site: ${options.site.name}`)
    }
    if (options.errors) {
      info.push(`Error Information: ${JSON.stringify(options.errors)}`)
    }

    if (info.length > 0) {
      super([options.message, ''].concat(info).join('\n'))
    } else {
      super(options.message)
    }

    this.http = error
    this.body = options
  }
}

export default class Client {
  public readonly config: Config
  private readonly credentials: Credentials
  private client: typeof Nimbu

  constructor(protected oclifConfig: IConfig, config: Config) {
    this.oclifConfig = oclifConfig
    this.config = config
    this.credentials = new Credentials(oclifConfig, this)
    this.client = this.createClient()
  }

  refreshClient() {
    this.client = this.createClient()
  }

  get token(): string | undefined {
    return this.credentials.token
  }

  login(options: Credentials.Options = {}) {
    return this.credentials.login(options)
  }

  async validateLogin(): Promise<boolean> {
    try {
      // if this returns a 401, it will try to reauthenticate
      await this.get<User>('/user')

      return true
    } catch {
      ux.warn('Sorry, you need to be authenticated to continue.')
      return false
    }
  }

  async logout() {
    try {
      await this.credentials.logout()
    } catch (err) {
      ux.warn(err)
    }
    delete Netrc.machines[this.config.apiHost]
    await Netrc.save()
  }

  get<T>(path: string, options: Client.Options = {}) {
    return this.request<T>('GET', path, options)
  }

  post<T>(path: string, options: Client.Options = {}) {
    return this.request<T>('POST', path, options)
  }

  put<T>(path: string, options: Client.Options = {}) {
    return this.request<T>('PUT', path, options)
  }

  patch<T>(path: string, options: Client.Options = {}) {
    return this.request<T>('PATCH', path, options)
  }

  delete<T>(path: string, options: Client.Options = {}) {
    return this.request<T>('DELETE', path, options)
  }

  async request<T>(method: string, path: string, options: Client.Options = {}, retries = 3): Promise<T> {
    retries--

    try {
      let result = (await this.client.request<T>(Object.assign({}, options, { method, path }))) as T
      return result
    } catch (error) {
      if (!error.statusCode) {
        // this is no regular http client error
        throw error
      }
      if (retries > 0) {
        if (options.retryAuth !== false && error.statusCode === 401) {
          await this.login()
          if (!options.headers) {
            options.headers = {}
          }
          options.headers.authorization = `Bearer ${this.token}`
          return this.request<T>(method, path, options, retries)
        }
      }
      throw new APIError(error)
    }
  }

  private createClient(): Nimbu {
    return new Nimbu({
      token: this.credentials.token,
      host: this.config.apiUrl,
      site: this.config.site,
      userAgent: this.oclifConfig.userAgent,
      clientVersion: this.oclifConfig.version,
    })
  }
}
