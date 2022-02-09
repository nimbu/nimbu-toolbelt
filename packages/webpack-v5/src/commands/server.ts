import Command from '@nimbu-cli/command'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import NimbuServer from '../nimbu-gem/server'
import WebpackDevServer from '../webpack/server'

export default class Server extends Command {
  static aliases = ['server:v5']
  static description = 'run the development server (webpack 5)'

  static flags = {
    nocookies: Flags.boolean({
      description: 'Leave cookies untouched i.s.o. clearing them.',
    }),
    port: Flags.integer({
      description: 'The port to listen on.',
      env: 'DEFAULT_PORT',
      default: 4567,
    }),
    host: Flags.string({
      description: 'The hostname/ip-address to bind on.',
      env: 'HOST',
      default: '0.0.0.0',
    }),
    'nimbu-port': Flags.integer({
      description: 'The port for the ruby nimbu server to listen on.',
      env: 'NIMBU_PORT',
      default: 4568,
    }),
    compass: Flags.boolean({
      description: 'Use legacy ruby SASS compilation.',
    }),
    nowebpack: Flags.boolean({
      description: 'Do not use webpack.',
    }),
    noopen: Flags.boolean({
      description: `Don't open/reload browser`,
      default: false,
    }),
    poll: Flags.boolean({
      description: `Tell webpack dev server to use polling`,
      default: false,
    }),
  }

  private _nimbuServer?: NimbuServer
  private readonly webpackServer: WebpackDevServer = new WebpackDevServer()

  private get nimbuServer() {
    if (this._nimbuServer === undefined) {
      throw new Error('Command not initialized yet')
    }
    return this._nimbuServer
  }

  async spawnNimbuServer(port: number, nocookies: boolean, compass: boolean) {
    this.log(chalk.red('Starting nimbu server...'))
    await this.nimbuServer.start(port, { nocookies, compass })
  }

  async stopNimbuServer() {
    this.log(chalk.red('Giving nimbu server some time to stop...'))
    await this.nimbuServer.stop()
  }

  async startWebpackDevServer(
    host: string,
    defaultPort: number,
    nimbuPort: number,
    open: boolean,
    options?: { poll?: boolean },
  ) {
    this.log(chalk.cyan('Starting the webpack-dev-server (Webpack 5)...\n'))
    await this.webpackServer.start(host, defaultPort, nimbuPort, 'http', open, options)
  }

  async stopWebpackDevServer() {
    await this.webpackServer.stop()
  }

  get initialized() {
    return super.initialized && this._nimbuServer !== undefined
  }

  async initialize() {
    if (!this.initialized) {
      await super.initialize()
      this._nimbuServer = new NimbuServer(this.nimbu, this.log, this.warn)
    }
  }

  async execute() {
    const { flags } = await this.parse(Server)

    await this.spawnNimbuServer(flags.nowebpack ? flags.port! : flags['nimbu-port']!, flags.nocookies, flags.compass)

    if (!flags.nowebpack) {
      await this.startWebpackDevServer(flags.host!, flags.port!, flags['nimbu-port']!, !flags.noopen, {
        poll: flags.poll,
      })
    }
    await this.waitForStopSignals()
    // Explicitly exit the process to make sure all subprocesses started by webpack plugins are gone
    process.exit(0)
  }

  async catch() {
    if (this.webpackServer.isRunning()) {
      await this.stopWebpackDevServer()
    }
    if (this.nimbuServer.isRunning()) {
      await this.stopNimbuServer()
    }
  }

  private waitForStopSignals(): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
      ;(['SIGINT', 'SIGTERM'] as Array<NodeJS.Signals>).forEach((sig) => {
        process.on(sig, async () => {
          this.log(chalk.cyan('Shutting down ...'))
          await this.stopWebpackDevServer()
          await this.stopNimbuServer()
          resolve()
        })
      })
    })
  }
}
