/* eslint-disable import/no-named-as-default */

import { Errors, Interfaces, ux } from '@oclif/core'
import Netrc from 'netrc-parser'
import Nimbu, { HTTPError } from 'nimbu-client'

import { Config } from './config'
import { Credentials, CredentialsOptions } from './credentials'
import { User } from './types'

type HTTPVerbs = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT'

export interface ISimulatorPayload {
  code: string
  files?: Record<string, string>
  path: string
  request: {
    body?: string
    headers: string
    method: string
    query: string
  }
  session: string
  version: string
}

export interface ISimulatorResponse {
  body: string
  encoding?: string
  headers: Record<string, string>
  status: number
}

export interface IAuthContext {
  apiHost: string
  apiUrl: string
  site: string | undefined
  token: string | undefined
}

export interface IOptions {
  auth?: string
  body?: object
  fetchAll?: boolean
  formData?: any
  headers?: any
  host?: string
  onNextPage?: (nextPage: string, lastPage: string) => void
  retryAuth?: boolean
  site?: string
}

export interface IValidationError {
  code: string
  field: string
  message: string
  resource: string
  resource_id: string
  value: string
}

export function isValidationError(error: any): error is IValidationError {
  return error.resource != null && error.field != null && error.message != null
}

export interface IAPIErrorOptions {
  code?: number
  errors?: IValidationError[] | string[]
  message?: string
  resource?: string
  site?: { id: string; name: string }
}

export class APIError extends Errors.CLIError {
  body: IAPIErrorOptions
  http: HTTPError

  constructor(error: HTTPError) {
    if (!error) throw new Error('invalid error')
    const options: IAPIErrorOptions = error.body
    if (!options || options instanceof String || !options.message) throw error

    const info: string[] = []
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
      super([options.message, '', ...info].join('\n'))
    } else {
      super(options.message)
    }

    this.http = error
    this.body = options
  }
}

export default class Client {
  public readonly config: Config
  private client: Nimbu
  private readonly credentials: Credentials

  constructor(protected oclifConfig: Interfaces.Config, config: Config) {
    this.oclifConfig = oclifConfig
    this.config = config
    this.credentials = new Credentials(oclifConfig, this)
    this.client = this.createClient()
  }

  get token(): string | undefined {
    return this.credentials.token
  }

  delete<T>(path: string, options: IOptions = {}) {
    return this.request<T>('DELETE', path, options)
  }

  get<T>(path: string, options: IOptions = {}) {
    return this.request<T>('GET', path, options)
  }

  getAuthContext(): IAuthContext {
    return {
      apiHost: this.config.apiHost,
      apiUrl: this.config.apiUrl,
      site: this.config.site,
      token: this.token,
    }
  }

  login(options: CredentialsOptions = {}) {
    return this.credentials.login(options)
  }

  async logout() {
    try {
      await this.credentials.logout()
    } catch (error) {
      if (error instanceof Error) {
        ux.warn(error)
      }
    }

    delete Netrc.machines[this.config.apiHost]
    await Netrc.save()
  }

  patch<T>(path: string, options: IOptions = {}) {
    return this.request<T>('PATCH', path, options)
  }

  post<T>(path: string, options: IOptions = {}) {
    return this.request<T>('POST', path, options)
  }

  put<T>(path: string, options: IOptions = {}) {
    return this.request<T>('PUT', path, options)
  }

  refreshClient() {
    this.client = this.createClient()
  }

  async request<T>(method: HTTPVerbs, path: string, options: IOptions = {}, retries = 3): Promise<T> {
    retries--

    try {
      const result = (await this.client.request<T>({ ...options, method, path })) as T
      return result
    } catch (error) {
      if (error instanceof HTTPError) {
        if (!error.statusCode) {
          // this is no regular http client error
          throw error
        }

        if (retries > 0 && options.retryAuth !== false && error.statusCode === 401) {
          await this.login()
          if (!options.headers) {
            options.headers = {}
          }

          options.headers.authorization = `Bearer ${this.token}`
          return this.request<T>(method, path, options, retries)
        }

        throw new APIError(error)
      } else {
        throw error
      }
    }
  }

  async simulatorRender(payload: ISimulatorPayload): Promise<ISimulatorResponse> {
    return this.request<ISimulatorResponse>('POST', '/simulator/render', {
      body: payload
    })
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

  private createClient(): Nimbu {
    return new Nimbu({
      clientVersion: this.oclifConfig.version,
      host: this.config.apiUrl,
      site: this.config.site,
      token: this.credentials.token,
      userAgent: this.oclifConfig.userAgent,
    })
  }
}
