import { Command } from '@oclif/core'
import * as buildConfig from './config/config'
import Client from './nimbu/client'
import { Config } from './nimbu/config'

export default abstract class extends Command {
  private _initialized?: boolean
  private _client?: Client
  private _buildConfig?: any
  private _nimbuConfig?: Config

  get initialized() {
    return !!this._initialized
  }

  async initialize() {
    if (!this.initialized) {
      // allow certain commands to skip config initialization
      if (this.needsConfig) this._buildConfig = await buildConfig.initialize()

      // setup the rest
      this._nimbuConfig = new Config(this._buildConfig)
      this._client = new Client(this.config, this.nimbuConfig)

      this._initialized = true
    }
  }

  async run() {
    await this.initialize()
    await this.execute()
  }

  protected abstract execute(): Promise<void>

  get buildConfig() {
    return this._buildConfig!
  }

  get nimbuConfig() {
    return this._nimbuConfig!
  }

  get nimbu(): Client {
    if (this._client === undefined) {
      throw new Error('Command not initialized yet')
    }
    return this._client
  }

  get needsConfig() {
    return !(this.argv.includes('--help') || this.argv.includes('help'))
  }
}
