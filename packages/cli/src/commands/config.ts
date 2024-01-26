import { Command } from '@nimbu-cli/command'
import chalk from 'chalk'

export default class Config extends Command {
  static description = 'Show resolved configuration'

  async execute() {
    await this.showBuildConfiguration()
    await this.showToolchainConfiguration()
  }

  async showBuildConfiguration() {
    this.log(chalk.red('Build configuration'))
    for (const key of Object.keys(this.buildConfig)) this.log(`${key}: ${this.buildConfig[key]}`)
  }

  async showToolchainConfiguration() {
    this.log(chalk.red('Toolchain configuration'))
    this.log(`site: ${this.nimbuConfig.site}`)
    this.log(`theme: ${this.nimbuConfig.theme}`)
    this.log(`host: ${this.nimbuConfig.apiHost}`)
    this.log(`admin domain: ${this.nimbuConfig.host}`)
  }
}
