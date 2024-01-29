/* eslint-disable no-process-exit */
/* eslint-disable unicorn/no-process-exit */
import { APIClient } from '@nimbu-cli/command'
import { ChildProcess } from 'node:child_process'

import spawn from './process'

export interface NimbuGemServerOptions {
  compass?: boolean
  haml?: boolean
  host?: string
  nocookies?: boolean
}

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => {
  throw err
})

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
    const args = ['--port', `${port}`]
    let embeddedGemfile = true

    if (options?.haml) {
      args.push('--haml')
    }

    if (options?.nocookies) {
      args.push('--nocookies')
    }

    if (options?.compass) {
      args.push('--compass')
      embeddedGemfile = false
    }

    if (options?.host) {
      args.push('--host', options.host)
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
    return new Promise<void>((resolve) => {
      this.process?.kill('SIGINT')

      resolve()
    })
  }

  private removeLastNewLine(data: string): string {
    const pos = data.lastIndexOf('\n')
    return data.slice(0, Math.max(0, pos)) + data.slice(Math.max(0, pos + 1))
  }
}
