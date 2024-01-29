/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-process-exit */
import { Command } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import detectPort from 'detect-port'
import { exit } from 'node:process'

import NimbuServer, { NimbuGemServerOptions } from '../nimbu-gem/server'
import WebpackDevServer from '../webpack/server'
export default class Server extends Command {
  static aliases = ['server:v5']
  static description = 'run the development server (webpack 5)'

  static flags = {
    compass: Flags.boolean({
      description: 'Use legacy ruby SASS compilation.',
    }),
    haml: Flags.boolean({
      description: 'Use legacy ruby HAML compiler.',
    }),
    host: Flags.string({
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
  private _shutdownPromise?: Promise<void>
  private readonly webpackServer: WebpackDevServer = new WebpackDevServer()

  get initialized() {
    return super.initialized && this._nimbuServer !== undefined
  }

  async catch() {
    if (this.webpackServer.isRunning()) {
      await this.stopWebpackDevServer()
    }

    if (this.nimbuServer.isRunning()) {
      await this.stopNimbuServer()
    }

    this.log(this.randomGreeting())
  }

  async execute() {
    try {
      this.debug('Starting server command')
      this.registerSignalHandlers()

      const { flags } = await this.parse(Server)

      const nimbuPort = (flags.nowebpack ? flags.port : flags['nimbu-port']) ?? 4567

      await this.checkPort(nimbuPort)
      await this.spawnNimbuServer(nimbuPort, {
        compass: flags.compass,
        haml: flags.haml,
        host: flags.host,
        nocookies: flags.nocookies,
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

      await this.waitForStopSignals()
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
        this._nimbuServer = new NimbuServer(this.nimbu, this.log.bind(this), this.warn.bind(this))
      }
    } catch (error) {
      console.error(error)
      exit(1)
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
    options?: { poll?: boolean },
  ) {
    this.log(chalk.cyan('\nStarting the webpack-dev-server (Webpack 5)...\n'))
    try {
      await this.webpackServer.start(host, defaultPort, nimbuPort, 'http', open, options)
    } catch (error) {
      console.error('⚠️  Could not start webpack-dev-server ⚠️ \n\n', error, '\n')
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
      console.error(`\n⚠️  There is already a process listening on port ${port} ⚠️ \n`)
      await this.catch()
      exit(1)
    }
  }

  private get nimbuServer() {
    if (this._nimbuServer === undefined) {
      throw new Error('Command not initialized yet')
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

  private registerCloseListener(fn: () => void): void {
    let run = false

    const wrapper = () => {
      if (!run) {
        run = true
        fn()
      }
    }

    // do something when app is closing
    process.on('exit', wrapper)

    // catches ctrl+c event
    process.on('SIGINT', wrapper)

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', wrapper)
    process.on('SIGUSR2', wrapper)

    // catches uncaught exceptions
    process.on('uncaughtException', wrapper)
  }

  private registerSignalHandlers() {
    this._shutdownPromise = new Promise((resolve) => {
      // Print out a message to let the user know we are shutting down the server
      // when they press Ctrl+C or kill the process externally.
      this.registerCloseListener(async () => {
        this.log()
        this.log(chalk.dim('Gracefully shutting down. Please wait...'))
        await this.catch()
        resolve()
        process.on('SIGINT', () => {
          this.log()
          this.warn('Force-closing all open sockets...')
          resolve()
          exit(0)
        })
      })
    })
  }

  private async waitForStopSignals() {
    if (this._shutdownPromise != null) {
      await this._shutdownPromise
    }
  }
}
