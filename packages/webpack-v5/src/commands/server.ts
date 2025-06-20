import { Command, displayNimbuHeader } from '@nimbu-cli/command'
import { WebpackIntegration } from '@nimbu-cli/proxy-server'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import detectPort from 'detect-port'
import { exit } from 'node:process'

import WebpackDevServer from '../webpack/server'
export default class Server extends Command {
  static aliases = ['server:v5']
  static description = 'run the development server (webpack 5)'

  private static _processListenersRegistered = false

  static flags = {
    debug: Flags.boolean({
      default: false,
      description: 'Enable debug logging for API requests (excludes template code for readability)',
    }),
    'dual-server': Flags.boolean({
      default: false,
      description: 'Use legacy dual-server mode (webpack + separate proxy server)',
    }),
    host: Flags.string({
      description: 'The hostname/ip-address to bind on.',
      env: 'HOST',
    }),
    'nimbu-port': Flags.integer({
      default: 4568,
      description: 'The port for the nimbu proxy server to listen on.',
      env: 'NIMBU_PORT',
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

  private _nimbuServer?: WebpackIntegration
  private _shutdownPromise?: Promise<void>
  private _shutdownHandlers: Array<() => void> = []
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

    this.log(this.randomGreeting())
  }

  async execute() {
    console.log('execute() method called')
    this.debug('execute() method called')
    try {
      displayNimbuHeader()

      this.debug('Starting server command')
      this.registerSignalHandlers()

      const { flags } = await this.parse(Server)

      if (flags['dual-server'] || flags.nowebpack) {
        // Legacy dual-server mode
        this.log(chalk.yellow('⚡ Using legacy dual-server mode (webpack + separate proxy)'))

        const nimbuPort = (flags.nowebpack ? flags.port : flags['nimbu-port']) ?? 4567

        await this.checkPort(nimbuPort)
        await this.spawnNimbuServer(nimbuPort, {
          debug: flags.debug,
          host: flags.host,
          templatePath: process.cwd(),
        })

        if (!flags.nowebpack) {
          await this.checkPort(flags.port)
          await this.startWebpackDevServer(
            flags.host ?? 'localhost',
            flags.port,
            flags['nimbu-port'] ?? 4567,
            !flags.noopen,
            {
              poll: flags.poll,
            },
          )
        }
      } else {
        // Default: Integrated proxy mode - single server on webpack port
        this.log(chalk.cyan('🚀 Using integrated proxy mode (single server)'))

        try {
          this.debug('Validating authentication...')
          // Validate authentication first
          await this.nimbu.validateLogin()
          const authContext = this.nimbu.getAuthContext()

          if (!authContext.token) {
            throw new Error('Not authenticated')
          }

          if (!authContext.site) {
            throw new Error('No site configured')
          }

          this.debug('Authentication validated successfully')
          this.debug(`Starting webpack dev server on port ${flags.port}`)

          await this.checkPort(flags.port)
          await this.startWebpackDevServer(
            flags.host ?? 'localhost',
            flags.port,
            flags['nimbu-port'] ?? 4567,
            !flags.noopen,
            {
              debug: flags.debug,
              integratedProxy: true,
              nimbuClient: this.nimbu,
              poll: flags.poll,
              templatePath: process.cwd(),
            },
          )

          this.debug('Webpack dev server started successfully')
        } catch (error) {
          this.log(chalk.red('Failed to start integrated proxy mode:'))
          console.error(error)
          throw error
        }
      }

      this.debug('About to register signal handlers')
      this.registerSignalHandlers()
      this.debug('About to wait for stop signals')
      await this.waitForStopSignals()
      this.debug('waitForStopSignals completed - this should not happen unless shutdown was triggered')
    } catch (error) {
      console.error(error)
      await this.catch()
      exit(1)
    }
  }

  async initialize() {
    this.debug('Initializing server command')
    try {
      if (!this.initialized) {
        await super.initialize()
        // WebpackIntegration will be created in spawnNimbuServer with the port
        this._nimbuServer = undefined
      }
    } catch (error) {
      console.error(error)
      exit(1)
    }
  }

  async spawnNimbuServer(port: number, options: { debug?: boolean; host?: string; templatePath?: string } = {}) {
    this.log(chalk.red('🚀 Starting Nimbu proxy server...'))

    // Validate authentication
    await this.nimbu.validateLogin()
    const authContext = this.nimbu.getAuthContext()

    if (!authContext.token) {
      throw new Error('Not authenticated')
    }

    if (!authContext.site) {
      throw new Error('No site configured')
    }

    // Create and start the Node.js proxy server with auth context
    this._nimbuServer = new WebpackIntegration({
      debug: options.debug,
      host: options.host || 'localhost',
      nimbuClient: this.nimbu,
      port,
      templatePath: options.templatePath || process.cwd(),
    })

    await this._nimbuServer.start()
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
    this.log(chalk.cyan('🚧 Starting the webpack-dev-server (Webpack 5)...\n'))
    try {
      await this.webpackServer.start(host, defaultPort, nimbuPort, 'http', open, options)
    } catch (error) {
      console.error('⚠️ Could not start webpack-dev-server ⚠️')
      console.error(`Mode: ${options?.integratedProxy ? 'Integrated Proxy' : 'Dual Server'}`)
      console.error('Error details:')
      console.error(error)
      if (error instanceof Error) {
        console.error('Stack trace:', error.stack)
      }

      console.error('')
      await this.catch()
      exit(1)
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
      console.error(`\n⚠️ There is already a process listening on port ${port} ⚠️ \n`)
      await this.catch()
      exit(1)
    }
  }

  private get nimbuServer() {
    if (this._nimbuServer === undefined) {
      throw new Error('Nimbu server not started yet')
    }

    return this._nimbuServer
  }

  private randomGreeting() {
    const greetings = [
      'My work is done here. Have a nice day!',
      "I'm outta here. Have a nice day!",
      "I'm done here. Happy coding!",
      'This script is self-destructing in 3... 2... 1... Just kidding, happy coding!',
      'That was fun! Have a nice day!',
      'That was fun! Keep calm and code on!',
      "Beep boop! I'm out of bytes. Have a nice day!",
      'Script out, mic drop! Enjoy your day!',
      'Logging off, stay variable!',
      'Script terminated. Time for some coffee!',
      "That's all, folks! Time for some tea!",
      "I'm off the grid(). Later, pixels!",
      'This script has left the console. See you later!',
      'End script. Time for a coffee break!',
    ]

    return greetings[Math.floor(Math.random() * greetings.length)]
  }

  private setupProcessListeners(): void {
    // Only register process listeners once
    if (Server._processListenersRegistered) {
      return
    }

    Server._processListenersRegistered = true

    const triggerShutdown = (eventType: string, error?: Error) => {
      this.debug(`Process event triggered: ${eventType}`)
      if (error) {
        this.debug(`Error details: ${error.message}`)
        this.debug(`Stack trace: ${error.stack}`)
      }

      // Call all registered shutdown handlers
      for (const handler of this._shutdownHandlers) {
        handler()
      }
    }

    // catches ctrl+c event
    process.on('SIGINT', () => triggerShutdown('SIGINT'))

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', () => triggerShutdown('SIGUSR1'))
    process.on('SIGUSR2', () => triggerShutdown('SIGUSR2'))

    // catches uncaught exceptions
    process.on('uncaughtException', (error) => triggerShutdown('uncaughtException', error))

    // Note: Removed process.on('exit') as it creates circular issues
  }

  private registerSignalHandlers() {
    // Only register if not already registered
    if (this._shutdownPromise) {
      this.debug('Signal handlers already registered, skipping')
      return
    }

    this.debug('Registering signal handlers')

    // Setup process listeners if not already done
    this.setupProcessListeners()

    let shutdownStarted = false

    this._shutdownPromise = new Promise((resolve) => {
      const shutdownHandler = async () => {
        if (shutdownStarted) {
          return
        }
        shutdownStarted = true

        this.debug('Shutdown handler triggered')
        this.log()
        this.log(chalk.dim('Gracefully shutting down. Please wait...'))
        await this.catch()
        resolve()

        // Second SIGINT forces immediate exit
        process.on('SIGINT', () => {
          this.log()
          this.warn('Force-closing all open sockets...')
          exit(0)
        })
      }

      // Register this handler
      this._shutdownHandlers.push(shutdownHandler)
    })

    this.debug('Signal handlers registered')
  }

  private async waitForStopSignals() {
    this.debug('waitForStopSignals called')
    if (this._shutdownPromise != null) {
      this.debug('Shutdown promise exists, waiting for it')
      await this._shutdownPromise
      this.debug('Shutdown promise resolved')
    } else {
      this.debug('WARNING: No shutdown promise exists!')
    }
  }
}
