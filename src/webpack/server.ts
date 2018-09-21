import webpack = require('webpack');
import DevServer = require('webpack-dev-server');
import path = require('path');
import paths = require('../config/paths');
import config = require('../config/webpack.dev.js');

const {
  choosePort,
  createCompiler,
  prepareUrls,
} = require('react-dev-utils/WebpackDevServerUtils');
const createDevServerConfig = require('../config/webpackDevServer.config.js');
const openBrowser = require('react-dev-utils/openBrowser');

export default class WebpackDevServer {
  private server?: any;

  private setupEnv() {
    process.env.BABEL_ENV = 'development';
    process.env.NODE_ENV = 'development';
  }

  private async listen(host: string, port: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.server) {
        this.server.listen(port, host, (err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        reject(new Error('Server is not set.'));
      }
    });
  }

  async start(
    host: string,
    defaultPort: number,
    nimbuPort: number,
    protocol: string
  ): Promise<void> {
    this.setupEnv();
    const port = await choosePort(host, defaultPort);
    if (port == null) {
      // We have not found a port.
      return Promise.reject(new Error('Could not find a port to run on.'));
    }
    const appName = require(path.resolve(
      paths.PROJECT_DIRECTORY,
      'package.json'
    )).name;
    const urls = prepareUrls(protocol, host, port);
    const compiler = createCompiler(
      webpack,
      config,
      appName,
      urls,
      true // useYarn
    );
    const proxyConfig = {
      '*': { target: `http://localhost:${nimbuPort}` },
    };
    // Serve webpack assets generated by the compiler over a web sever.
    const serverConfig = createDevServerConfig(
      proxyConfig,
      urls.lanUrlForConfig,
      host,
      protocol
    );
    this.server = new DevServer(compiler, serverConfig);
    // Launch WebpackDevServer.
    try {
      await this.listen(host, port);
    } catch(err) {
      this.server = undefined;
      throw err;
    }
    openBrowser(urls.localUrlForBrowser);
  }

  async stop(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.server) {
        this.server.close((err: Error | null) => {
          if (err) {
            reject(err);
          } else {
            this.server = undefined;
            resolve();
          }
        });
      } else {
        reject(new Error('Server is not started'));
      }
    });
  }

  isRunning() : boolean {
    return this.server !== undefined;
  }
}