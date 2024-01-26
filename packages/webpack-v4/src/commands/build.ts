import { Command, buildConfig } from '@nimbu-cli/command'
import { ux } from '@oclif/core'

import defaultWebpackConfig = require('../config/webpack.prod')
import projectWebpack = require('../config/webpack.project')
const { get: getProjectConfig } = buildConfig

import chalk from 'chalk'

import webpack = require('webpack')

export default class Build extends Command {
  static aliases = ['build:v4']
  static description = 'build a production bundle of your JS and CSS (using webpack 4)'

  async execute() {
    try {
      process.env.NODE_ENV = 'production'

      ux.action.start(chalk.red('building for production (using webpack 4)'))
      const webpackConfig = projectWebpack.customize(defaultWebpackConfig(), getProjectConfig())
      const stats = await this.webpack(webpackConfig)
      ux.action.stop()
      this.log(
        stats.toString({
          children: false,
          chunkModules: false,
          chunks: false,
          colors: true,
          modules: false,
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

  webpack(config: webpack.Configuration): Promise<webpack.Stats> {
    return new Promise((resolve, reject) => {
      webpack(config, (err, stats) => {
        if (err || stats == null) {
          reject(err)
        } else {
          resolve(stats)
        }
      })
    })
  }
}
