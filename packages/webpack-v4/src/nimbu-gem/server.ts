/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-process-exit */
import { APIClient } from '@nimbu-cli/command'
import { ChildProcess } from 'node:child_process'

import spawn from './process'

export interface NimbuGemServerOptions {
  compass?: boolean
  haml?: boolean
  nocookies?: boolean
}

export default class NimbuGemServer {
  private readonly errorLogger?: (message: string) => void
  private readonly handleStderr = (data: any): void => {
    if (this.errorLogger) {
      this.errorLogger(this.removeLastNewLine(data.toString()))
    }
  }

  private readonly handleStdout = (data: any): void => {
    if (this.logger) {
      this.logger(this.removeLastNewLine(data.toString()))
    }
  }

  private readonly logger?: (message: string) => void

  private readonly nimbu: APIClient

  private process?: ChildProcess

  constructor(nimbuClient: APIClient, logger?: (message: string) => void, errorLogger?: (message: string) => void) {
    this.logger = logger
    this.errorLogger = errorLogger
    this.nimbu = nimbuClient
  }

  isRunning(): boolean {
    return this.process !== undefined
  }

  async start(port: number, options?: NimbuGemServerOptions): Promise<void> {
    const args = ['--host', '127.0.0.1', '--port', `${port}`]
    let embeddedGemfile = true

    if (options && options.haml) {
      args.push('--haml')
    }

    if (options && options.nocookies) {
      args.push('--nocookies')
    }

    if (options && options.compass) {
      args.push('--compass')
      embeddedGemfile = false
    }

    await this.nimbu.validateLogin()
    if (this.nimbu.token === undefined) {
      throw new Error('Not authenticated')
    }

    if (this.nimbu.config.site == null) {
      throw new Error('No site configured')
    }

    this.process = spawn(
      this.nimbu.config.site,
      this.nimbu.token,
      'server',
      args,
      ['inherit', 'pipe', 'pipe'],
      embeddedGemfile,
    )
    this.process.stdout?.on('data', this.handleStdout)
    this.process.stderr?.on('data', this.handleStderr)

    return new Promise<void>((resolve, reject) => {
      const startListener = (data: any) => {
        if (/Listening on .*, CTRL\+C to stop/.test(data.toString())) {
          this.process?.stdout?.removeListener('data', startListener)
          resolve()
        } else if (/ERROR/.test(data.toString())) {
          this.process?.stdout?.removeListener('data', startListener)
          reject(new Error('Could not start nimbu server'))
        }
      }

      this.process?.stdout?.on('data', startListener)
    })
  }

  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      function exitHandler(options) {
        if (options.exit) process.exit()

        resolve()
      }

      if (this.process) {
        // do something when app is closing
        this.process.on('exit', exitHandler.bind(null, { cleanup: true }))

        // catches ctrl+c event
        this.process.on('SIGINT', exitHandler.bind(null, { exit: true }))

        // catches "kill pid" (for example: nodemon restart)
        this.process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
        this.process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))

        // catches uncaught exceptions
        this.process.on('uncaughtException', exitHandler.bind(null, { exit: true }))

        this.process.kill('SIGTERM')
      } else {
        reject(new Error('Server is not started'))
      }
    })
  }

  private removeLastNewLine(data: string): string {
    const pos = data.lastIndexOf('\n')
    return data.slice(0, Math.max(0, pos)) + data.slice(Math.max(0, pos + 1))
  }
}
