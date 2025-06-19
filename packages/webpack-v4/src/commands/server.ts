/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-process-exit */
import { Command } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import detectPort from 'detect-port'

import NimbuServer, { NimbuGemServerOptions } from '../nimbu-gem/server'
import WebpackDevServer from '../webpack/server'
export default class Server extends Command {
  static aliases = ['server:v4']
  static description = 'run the development server (webpack 4)'

  static flags = {
    compass: Flags.boolean({
      description: 'Use legacy ruby SASS compilation.',
    }),
    debug: Flags.boolean({
      default: false,
      description: 'Enable debug logging for API requests',
    }),
    'dual-server': Flags.boolean({
      default: false,
      description: 'Use legacy dual-server mode (webpack + separate ruby server)',
    }),
    haml: Flags.boolean({
      description: 'Use legacy ruby HAML compiler.',
    }),
    host: Flags.string({
      default: '0.0.0.0',
      description: 'The hostname/ip-address to bind on.',
      env: 'HOST',
    }),
    'nimbu-port': Flags.integer({
      default: 4568,
      description: 'The port for the ruby nimbu server to listen on.',
      env: 'NIMBU_PORT',
    }),
    nocookies: Flags.boolean({
      description: 'Leave cookies untouched i.s.o. clearing them.',
    }),
    noopen: Flags.boolean({
      default: false,
      description: `Don't open/reload browser`,
    }),
    nowebpack: Flags.boolean({
      description: 'Do not use webpack.',
    }),
    poll: Flags.boolean({
      default: false,
      description: `Tell webpack dev server to use polling`,
    }),
    port: Flags.integer({
      default: 4567,
      description: 'The port to listen on.',
      env: 'DEFAULT_PORT',
    }),
  }

  private _nimbuServer?: NimbuServer
  private readonly webpackServer: WebpackDevServer = new WebpackDevServer()

  get initialized() {
    return super.initialized && this._nimbuServer !== undefined
  }

  async catch() {
    if (this.webpackServer.isRunning()) {
      await this.stopWebpackDevServer()
    }

    if (this._nimbuServer && this.nimbuServer.isRunning()) {
      await this.stopNimbuServer()
    }
  }

  async execute() {
    this.registerSignalHandlers()

    try {
      this.debug('Starting server command')
      const { flags } = await this.parse(Server)

      if (flags['dual-server'] || flags.nowebpack) {
        // Legacy dual-server mode with Ruby server
        this.log(chalk.yellow('⚡ Using legacy dual-server mode (webpack + separate ruby server)'))
        
        const nimbuPort = (flags.nowebpack ? flags.port : flags['nimbu-port']) ?? 4567

        await this.checkPort(nimbuPort)
        await this.spawnNimbuServer(nimbuPort, {
          compass: flags.compass,
          haml: flags.haml,
          nocookies: flags.nocookies,
        })

        if (!flags.nowebpack) {
          await this.checkPort(flags.port)
          await this.startWebpackDevServer(flags.host, flags.port, flags['nimbu-port'] ?? 4567, !flags.noopen, {
            poll: flags.poll,
          })
        }
      } else {
        // Default: Integrated proxy mode using Node.js proxy server
        this.log(chalk.cyan('🚀 Using integrated proxy mode (single server)'))
        
        // Validate authentication first
        await this.nimbu.validateLogin()
        const authContext = this.nimbu.getAuthContext()

        if (!authContext.token) {
          throw new Error('Not authenticated')
        }

        if (!authContext.site) {
          throw new Error('No site configured')
        }

        await this.checkPort(flags.port)
        await this.startWebpackDevServer(flags.host, flags.port, flags['nimbu-port'] ?? 4567, !flags.noopen, {
          debug: flags.debug,
          integratedProxy: true,
          nimbuClient: this.nimbu,
          poll: flags.poll,
          templatePath: process.cwd(),
        })
      }

      await this.waitForStopSignals()
    } catch (error) {
      console.error(error)
      process.exit(1)
    }

    // Explicitly exit the process to make sure all subprocesses started by webpack plugins are gone
    process.exit(0)
  }

  async initialize() {
    this.debug('Initializing server command')
    try {
      if (!this.initialized) {
        await super.initialize()
        this._nimbuServer = new NimbuServer(this.nimbu, this.log.bind(this), this.warn.bind(this))
      }
    } catch (error) {
      console.error(error)
      process.exit(1)
    }
  }

  async spawnNimbuServer(port: number, options: NimbuGemServerOptions = {}) {
    this.log(chalk.red('Starting nimbu server...'))
    await this.nimbuServer.start(port, options)
  }

  // eslint-disable-next-line max-params
  async startWebpackDevServer(
    host: string,
    defaultPort: number,
    nimbuPort: number,
    open: boolean,
    options?: { 
      debug?: boolean
      integratedProxy?: boolean
      nimbuClient?: any
      poll?: boolean
      templatePath?: string
    },
  ) {
    this.log(chalk.cyan('\nStarting the webpack-dev-server (Webpack 4)...\n'))
    try {
      await this.webpackServer.start(host, defaultPort, nimbuPort, 'http', open, options)
    } catch (error) {
      console.error('⚠️  Could not start webpack-dev-server ⚠️ \n\n', error, '\n')
      await this.catch()
      process.exit(1)
    }
  }

  async stopNimbuServer() {
    await this.nimbuServer.stop()
  }

  async stopWebpackDevServer() {
    await this.webpackServer.stop()
  }

  private async checkPort(port: number) {
    const suggestedPort = await detectPort(port)

    if (suggestedPort !== port) {
      console.error(`\n⚠️  There is already a process listening on port ${port} ⚠️ \n`)
      await this.catch()
      process.exit(1)
    }
  }

  private get nimbuServer() {
    if (this._nimbuServer === undefined) {
      throw new Error('Command not initialized yet')
    }

    return this._nimbuServer
  }

  private registerSignalHandlers() {
    const exitHandler = async (options) => {
      await this.catch()

      if (options.exit) process.exit()
    }

    // do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }))

    // catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true }))

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }))
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }))

    // catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }))
  }

  private waitForStopSignals(): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
      for (const sig of ['SIGHUP', 'SIGINT', 'SIGTERM'] as Array<NodeJS.Signals>) {
        process.on(sig, async () => {
          this.log(chalk.cyan('Shutting down ...'))
          await this.stopWebpackDevServer()
          await this.stopNimbuServer()
          resolve()
        })
      }
    })
  }
}
