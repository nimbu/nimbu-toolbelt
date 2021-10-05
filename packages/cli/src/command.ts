import Command from '@oclif/command'
import Client from './nimbu/client'
import buildConfig = require('./config/config')
import NimbuConfig from './nimbu/config'

export default abstract class extends Command {
  private _client?: Client
  private _buildConfig?: any
  private _nimbuConfig?: NimbuConfig

  get initialized() {
    return this._buildConfig !== undefined && this._nimbuConfig !== undefined && this._client !== undefined
  }

  async initialize() {
    if (!this.initialized) {
      this._buildConfig = await buildConfig.initialize()
      this._nimbuConfig = new NimbuConfig(this._buildConfig)
      this._client = new Client(this.config, this.nimbuConfig)
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
}
