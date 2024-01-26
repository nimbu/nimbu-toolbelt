import { Command } from '@oclif/core'

import * as buildConfig from './config/config'
import Client from './nimbu/client'
import { Config } from './nimbu/config'

export default abstract class extends Command {
  private _buildConfig?: any
  private _client?: Client
  private _initialized?: boolean
  private _nimbuConfig?: Config

  get buildConfig() {
    if (!this._buildConfig) {
      throw new Error('Build config is not initialized')
    }

    return this._buildConfig
  }

  get initialized() {
    return Boolean(this._initialized)
  }

  get needsConfig() {
    return !(this.argv.includes('--help') || this.argv.includes('help'))
  }

  get nimbu(): Client {
    if (this._client === undefined) {
      throw new Error('Command not initialized yet')
    }

    return this._client
  }

  get nimbuConfig() {
    if (!this._nimbuConfig) {
      throw new Error('Nimbu config is not initialized')
    }

    return this._nimbuConfig
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
}
