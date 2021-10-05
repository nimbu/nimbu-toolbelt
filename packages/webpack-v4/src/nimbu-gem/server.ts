import { ChildProcess } from 'child_process'
import { Client } from 'nimbu'
import spawn from './process'

export interface NimbuGemServerOptions {
  nocookies?: boolean
  compass?: boolean
}

export default class NimbuGemServer {
  private process?: ChildProcess
  private readonly logger?: (message: string) => void
  private readonly errorLogger?: (message: string) => void
  private readonly nimbu: Client

  constructor(nimbuClient: Client, logger?: (message: string) => void, errorLogger?: (message: string) => void) {
    this.logger = logger
    this.errorLogger = errorLogger
    this.nimbu = nimbuClient
  }

  isRunning(): boolean {
    return this.process !== undefined
  }

  async start(port: number, options?: NimbuGemServerOptions): Promise<void> {
    const args = ['--haml', '--host', '127.0.0.1', '--port', `${port}`]
    let embeddedGemfile = true

    if (options && options.nocookies) {
      args.push('--nocookies')
    }

    if (options && options.compass) {
      args.push('--compass')
      embeddedGemfile = false
    }

    await this.nimbu.validateLogin()
    if (this.nimbu.token === undefined) {
      return Promise.reject(new Error('Not authenticated'))
    }

    this.process = spawn(
      this.nimbu.config.site!,
      this.nimbu.token,
      'server',
      args,
      ['inherit', 'pipe', 'pipe'],
      embeddedGemfile,
    )
    this.process.stdout!.on('data', this.handleStdout)
    this.process.stderr!.on('data', this.handleStderr)

    return new Promise<void>((resolve, reject) => {
      const startListener = (data: any) => {
        if (/Listening on .*, CTRL\+C to stop/.test(data.toString())) {
          this.process!.stdout!.removeListener('data', startListener)
          resolve()
        } else if (/ERROR/.test(data.toString())) {
          this.process!.stdout!.removeListener('data', startListener)
          reject(new Error('Could not start nimbu server'))
        }
      }
      this.process!.stdout!.on('data', startListener)
    })
  }

  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.process) {
        this.process.once('close', () => {
          this.process = undefined
          resolve()
        })
        this.process.kill('SIGTERM')
      } else {
        reject(new Error('Server is not started'))
      }
    })
  }

  private removeLastNewLine(data: string): string {
    const pos = data.lastIndexOf('\n')
    return data.substring(0, pos) + data.substring(pos + 1)
  }

  private readonly handleStdout = (data: any): void => {
    if (this.logger) {
      this.logger(this.removeLastNewLine(data.toString()))
    }
  }

  private readonly handleStderr = (data: any): void => {
    if (this.errorLogger) {
      this.errorLogger(this.removeLastNewLine(data.toString()))
    }
  }
}
