/* eslint-disable unicorn/no-process-exit */
/* eslint-disable no-process-exit */
import { Command, buildConfig } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'
import ora from 'ora'
const { get: getProjectConfig } = buildConfig

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024

export default class Build extends Command {
  static aliases = ['build:v5']
  static description = 'build a production bundle of your JS and CSS (using webpack 5)'

  static flags = {
    stats: Flags.boolean({
      description: 'Write bundle-stats.json file with detailed build info',
    }),
  }

  async execute() {
    // Makes the script crash on unhandled rejections instead of silently
    // ignoring them. In the future, promise rejections that are not handled will
    // terminate the Node.js process with a non-zero exit code.
    process.on('unhandledRejection', (err) => {
      throw err
    })

    const spinner = ora('Preparing build configuration...').start()

    const { flags } = await this.parse(Build)

    // Set environment files to 'production'
    process.env.BABEL_ENV = 'production'
    process.env.NODE_ENV = 'production'

    // Load config
    const configFactory = require('../config/webpack.config')
    const projectWebpack = require('../config/webpack.project')
    const webpackConfig = projectWebpack.customize(configFactory('production'), getProjectConfig())

    const chalk = require('react-dev-utils/chalk')
    const bfj = require('bfj')
    const webpack = require('webpack')
    const paths = require('../config/paths')
    const formatWebpackMessages = require('react-dev-utils/formatWebpackMessages')
    const FileSizeReporter = require('react-dev-utils/FileSizeReporter')
    const printBuildError = require('react-dev-utils/printBuildError')
    const { printFileSizesAfterBuild } = FileSizeReporter

    const isInteractive = process.stdout.isTTY

    const writeStatsJson = Boolean(flags.stats)

    // We require that you explicitly set browsers and do not fall back to
    // browserslist defaults.
    const { checkBrowsers } = require('react-dev-utils/browsersHelper')
    checkBrowsers(paths.appPath, isInteractive)
      .then(() => {
        spinner.text = 'Creating an optimized production build...'
        spinner.color = 'yellow'

        // Start the webpack build
        const compiler = webpack(webpackConfig)
        return new Promise((resolve, reject) => {
          compiler.run((err, stats) => {
            let messages
            if (err) {
              if (!err.message) {
                return reject(err)
              }

              let errMessage = err.message

              // Add additional information for postcss errors
              if (Object.prototype.hasOwnProperty.call(err, 'postcssNode')) {
                errMessage += '\nCompileError: Begins at CSS selector ' + err.postcssNode.selector
              }

              messages = formatWebpackMessages({
                errors: [errMessage],
                warnings: [],
              })
            } else {
              messages = formatWebpackMessages(stats.toJson({ all: false, errors: true, warnings: true }))
            }

            if (messages.errors.length > 0) {
              // Only keep the first error. Others are often indicative
              // of the same problem, but confuse the reader with noise.
              if (messages.errors.length > 1) {
                messages.errors.length = 1
              }

              return reject(new Error(messages.errors.join('\n\n')))
            }

            if (
              process.env.CI &&
              (typeof process.env.CI !== 'string' || process.env.CI.toLowerCase() !== 'false') &&
              messages.warnings.length > 0
            ) {
              // Ignore sourcemap warnings in CI builds. See #8227 for more info.
              const filteredWarnings = messages.warnings.filter((w) => !/Failed to parse source map/.test(w))
              if (filteredWarnings.length > 0) {
                console.log(
                  chalk.yellow(
                    '\nTreating warnings as errors because process.env.CI = true.\n' +
                      'Most CI servers set it automatically.\n',
                  ),
                )
                return reject(new Error(filteredWarnings.join('\n\n')))
              }
            }

            const resolveArgs = {
              stats,
              warnings: messages.warnings,
            }

            if (writeStatsJson) {
              return bfj
                .write(paths.appBuild + '/bundle-stats.json', stats.toJson())
                .then(() => resolve(resolveArgs))
                .catch((error) => reject(new Error(error)))
            }

            return resolve(resolveArgs)
          })
        })
      })
      .then(
        ({ stats, warnings }) => {
          if (warnings.length > 0) {
            spinner.warn(chalk.yellow('Compiled with warnings.\n'))
            console.log(warnings.join('\n\n'))
            console.log(
              '\nSearch for the ' + chalk.underline(chalk.yellow('keywords')) + ' to learn more about each warning.',
            )
            console.log('To ignore, add ' + chalk.cyan('// eslint-disable-next-line') + ' to the line before.\n')
          } else {
            spinner.succeed(chalk.green('Compiled successfully.\n'))
          }

          console.log('File sizes after gzip:\n')
          printFileSizesAfterBuild(
            stats,
            {
              // we skip the beforeBuildSize as it can take a loooong time to recursively walk the whole project
              root: paths.appBuild,
              sizes: {},
            },
            paths.appBuild,
            WARN_AFTER_BUNDLE_GZIP_SIZE,
            WARN_AFTER_CHUNK_GZIP_SIZE,
          )
          console.log()
        },
        (error) => {
          const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === 'true'
          if (tscCompileOnError) {
            spinner.warn(
              chalk.yellow(
                'Compiled with the following type errors (you may want to check these before deploying your app):\n',
              ),
            )

            printBuildError(error)
          } else {
            spinner.fail(chalk.red('Failed to compile.\n'))
            printBuildError(error)
            process.exit(1)
          }
        },
      )
      .catch((error) => {
        spinner.fail('There was an unexpected error!')

        if (error && error.message) {
          console.log(error.message)
        }

        process.exit(1)
      })
  }
}
