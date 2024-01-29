import paths = require('../config/paths')
import defaultConfig = require('../config/webpack.dev.js')
import projectWebpack = require('../config/webpack.project.js')
import path = require('path')
import webpack = require('webpack')
import DevServer = require('webpack-dev-server')
const {
  buildConfig: { get: getProjectConfig },
} = require('@nimbu-cli/command')

const { choosePort, createCompiler, prepareUrls } = require('react-dev-utils/WebpackDevServerUtils')
const createDevServerConfig = require('../config/webpack-dev-server.config.js')
const openBrowser = require('react-dev-utils/openBrowser')

export default class WebpackDevServer {
  private server?: any

  isRunning(): boolean {
    return this.server !== undefined
  }

  // eslint-disable-next-line max-params
  async start(
    host: string,
    defaultPort: number,
    nimbuPort: number,
    protocol: string,
    open: boolean,
    options?: { poll?: boolean },
  ): Promise<void> {
    this.setupEnv()
    const port = await choosePort(host, defaultPort)
    if (port == null) {
      // We have not found a port.
      throw new Error('Could not find a port to run on.')
    }

    const appName = require(path.resolve(paths.PROJECT_DIRECTORY, 'package.json')).name
    const urls = prepareUrls(protocol, host, port)
    const config = projectWebpack.customize(defaultConfig(), getProjectConfig())
    const compiler = createCompiler({
      appName,
      config,
      urls,
      useYarn: true, // useYarn
      webpack,
    })
    const proxyConfig = {
      '*': {
        onError(err: any) {
          console.log('Could not proxy to Nimbu Dev Server:', err)
        },
        target: `http://127.0.0.1:${nimbuPort}`,
      },
    }
    // Serve webpack assets generated by the compiler over a web sever.
    const serverConfig = createDevServerConfig(proxyConfig, urls.lanUrlForConfig, host, protocol, {
      poll: options?.poll ?? false,
    })
    this.server = new DevServer(compiler, serverConfig)
    // Launch WebpackDevServer.
    try {
      await this.listen(host, port)
    } catch (error) {
      this.server = undefined
      throw error
    }

    if (open) {
      openBrowser(urls.localUrlForBrowser)
    }
  }

  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.server) {
        this.server.close((err: Error | null) => {
          if (err) {
            reject(err)
          } else {
            this.server = undefined
            resolve()
          }
        })
      } else {
        reject(new Error('Server is not started'))
      }
    })
  }

  private async listen(host: string, port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.server) {
        this.server.listen(port, host, (err: Error | null) => {
          if (err) {
            console.error('ERRRROR')
            console.error(err)
            reject(err)
          } else {
            resolve()
          }
        })
      } else {
        reject(new Error('Server is not set.'))
      }
    })
  }

  private setupEnv() {
    process.env.BABEL_ENV = 'development'
    process.env.NODE_ENV = 'development'
  }
}
