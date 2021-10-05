import Command from '../command'
import chalk from 'chalk'

export default class Config extends Command {
  static description = 'Show resolved configuration'

  async showBuildConfiguration() {
    this.log(chalk.red('Build configuration'))
    Object.keys(this.buildConfig).forEach((key) => this.log(`${key}: ${this.buildConfig[key]}`))
  }

  async showToolchainConfiguration() {
    this.log(chalk.red('Toolchain configuration'))
    this.log(`site: ${this.nimbuConfig.site}`)
    this.log(`theme: ${this.nimbuConfig.theme}`)
    this.log(`host: ${this.nimbuConfig.apiHost}`)
    this.log(`admin domain: ${this.nimbuConfig.host}`)
  }

  async execute() {
    await this.showBuildConfiguration()
    await this.showToolchainConfiguration()
  }
}
