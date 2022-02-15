import Command from '@nimbu-cli/command'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import NimbuServer, { NimbuGemServerOptions } from '../nimbu-gem/server'
import WebpackDevServer from '../webpack/server'
import detectPort from 'detect-port'
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
    haml: Flags.boolean({
      description: 'Use legacy ruby HAML compiler.',
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

  async spawnNimbuServer(port: number, options: NimbuGemServerOptions = {}) {
    this.log(chalk.red('Starting nimbu server...'))
    await this.nimbuServer.start(port, options)
  }

  async stopNimbuServer() {
    await this.nimbuServer.stop()
  }

  async startWebpackDevServer(
    host: string,
    defaultPort: number,
    nimbuPort: number,
    open: boolean,
    options?: { poll?: boolean },
  ) {
    this.log(chalk.cyan('\nStarting the webpack-dev-server (Webpack 5)...\n'))
    try {
      await this.webpackServer.start(host, defaultPort, nimbuPort, 'http', open, options)
    } catch (error) {
      console.error('⚠️  Could not start webpack-dev-server ⚠️ \n\n', error, '\n')
      await this.catch()
      process.exit(1)
    }
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
      this._nimbuServer = new NimbuServer(this.nimbu, this.log.bind(this), this.warn.bind(this))
    }
  }

  async execute() {
    this.registerSignalHandlers()

    const { flags } = await this.parse(Server)

    const nimbuPort = flags.nowebpack ? flags.port : flags['nimbu-port']!

    await this.checkPort(nimbuPort)
    await this.spawnNimbuServer(nimbuPort, {
      nocookies: flags.nocookies,
      compass: flags.compass,
      haml: flags.haml,
    })

    if (!flags.nowebpack) {
      await this.checkPort(flags.port)
      await this.startWebpackDevServer(flags.host, flags.port, flags['nimbu-port']!, !flags.noopen, {
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

  private registerSignalHandlers() {
    const exitHandler = async (options) => {
      await this.catch()

      if (options.exit) process.exit()
    }

    //do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }))

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true }))

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
  }

  private async checkPort(port: number) {
    const suggestedPort = await detectPort(port)

    if (suggestedPort != port) {
      console.error(`\n⚠️  There is already a process listening on port ${port} ⚠️ \n`)
      await this.catch()
      process.exit(1)
    }
  }

  private waitForStopSignals(): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
      ;(['SIGHUP', 'SIGINT', 'SIGTERM'] as Array<NodeJS.Signals>).forEach((sig) => {
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
