import Command from '@nimbu-cli/command'
import defaultWebpackConfig = require('../config/webpack.prod')
import projectWebpack = require('../config/webpack.project')

import { buildConfig } from '@nimbu-cli/command'
const { get: getProjectConfig } = buildConfig

import webpack = require('webpack')
import cli from 'cli-ux'
import chalk from 'chalk'

export default class Build extends Command {
  static description = 'build a production version of your javascript and CSS'

  webpack(config: webpack.Configuration): Promise<webpack.Stats> {
    return new Promise((resolve, reject) => {
      webpack(config, (err, stats) => {
        if (err) {
          reject(err)
        } else {
          resolve(stats)
        }
      })
    })
  }

  async execute() {
    try {
      process.env.NODE_ENV = 'production'

      cli.action.start('building for production')
      const webpackConfig = projectWebpack.customize(defaultWebpackConfig(), getProjectConfig())
      const stats = await this.webpack(webpackConfig)
      cli.action.stop()
      this.log(
        stats.toString({
          colors: true,
          modules: false,
          children: false,
          chunks: false,
          chunkModules: false,
        }) + '\n\n',
      )
      this.log(chalk.cyan('  Build complete.\n'))
      this.log(
        chalk.yellow(
          '  Tip: built files are meant to be served over an HTTP server.\n' +
            "  Opening index.html over file:// won't work.\n",
        ),
      )
    } catch (error) {
      this.log(chalk.red('There was a problem while building your project:'))

      if (error instanceof Error) {
        this.log(error.message)
      }
    }
  }
}
