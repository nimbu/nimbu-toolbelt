// const fs = require('node:fs')
// const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware')
// const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware')
const ignoredFiles = require('react-dev-utils/ignoredFiles')
// const redirectServedPath = require('react-dev-utils/redirectServedPathMiddleware')
const paths = require('./paths')
const getHttpsConfig = require('./get-https-config.js')

// Import proxy server components for integrated mode
let ProxyServer, TemplatePacker, SimulatorFormatter
try {
  const proxyModule = require('@nimbu-cli/proxy-server')
  ProxyServer = proxyModule.ProxyServer
  TemplatePacker = proxyModule.TemplatePacker
  SimulatorFormatter = proxyModule.SimulatorFormatter
} catch (error) {
  // Proxy server not available, will fall back to separate server mode
}

const host = process.env.HOST || '0.0.0.0'
const sockHost = process.env.WDS_SOCKET_HOST
const sockPath = process.env.WDS_SOCKET_PATH // default: '/ws'
const sockPort = process.env.WDS_SOCKET_PORT

module.exports = function (proxy, allowedHosts, options = {}) {
  const disableFirewall = !proxy || process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true'
  const useIntegratedProxy = options.integratedProxy && ProxyServer && options.nimbuClient

  let setupMiddlewares
  if (useIntegratedProxy) {
    setupMiddlewares = (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined')
      }

      const express = require('express')
      const cors = require('cors')
      const compression = require('compression')
      const helmet = require('helmet')

      // Initialize proxy server components
      const templatePacker = new TemplatePacker(options.templatePath || process.cwd())
      const simulatorFormatter = new SimulatorFormatter(templatePacker)

      // Add security middleware
      devServer.app.use(
        helmet({
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false,
        }),
      )

      // Add CORS middleware
      devServer.app.use(
        cors({
          credentials: true,
          origin: true,
        }),
      )

      // Add compression
      devServer.app.use(compression())

      // Add middleware to serve images and fonts from template root directory
      devServer.app.use('/images', express.static(require('path').join(process.cwd(), 'images')))
      devServer.app.use('/fonts', express.static(require('path').join(process.cwd(), 'fonts')))

      // Add unified body parsing middleware for v3 simulator
      devServer.app.use((req, res, next) => {
        // Skip for GET requests and webpack resources
        if (req.method === 'GET' || req.path.includes('/__webpack') || req.path.includes('/sockjs-node')) {
          return next()
        }

        // Use express.raw to capture raw body
        express.raw({
          limit: '64mb',
          type: '*/*',
        })(req, res, (rawErr) => {
          if (rawErr) {
            return next(rawErr)
          }

          // Store raw body for v3 simulator
          if (req.body && Buffer.isBuffer(req.body)) {
            req.rawBody = req.body
          }

          // Parse body based on content type for Express compatibility
          const contentType = req.get('content-type') || ''

          if (contentType.includes('application/json')) {
            try {
              if (req.rawBody) {
                req.body = JSON.parse(req.rawBody.toString())
              }
            } catch {
              req.body = {}
            }
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            try {
              if (req.rawBody) {
                const querystring = require('node:querystring')
                req.body = querystring.parse(req.rawBody.toString())
              }
            } catch {
              req.body = {}
            }
          }

          next()
        })
      })

      // Add proxy server request handler before webpack's default handlers
      middlewares.unshift((req, res, next) => {
        // Skip all webpack-related resources including HMR
        if (
          req.path.includes('/__webpack') ||
          req.path.includes('/sockjs-node') ||
          req.path.includes('.hot-update.') ||
          req.path.startsWith('/__') ||
          req.path === '/webpack.stats.json' ||
          req.path === '/ws' ||
          req.headers.upgrade === 'websocket'
        ) {
          return next()
        }

        // Check if request should be handled by simulator
        if (!SimulatorFormatter.shouldHandleRequest(req, options.webpackResources)) {
          return next()
        }

        // Process request with integrated proxy logic
        ;(async () => {
          const timestamp = new Date().toISOString()

          try {
            // Verify authentication
            const authContext = options.nimbuClient.getAuthContext()
            if (!authContext.token) {
              throw new Error('Authentication required')
            }
            if (!authContext.site) {
              throw new Error('Site configuration missing')
            }

            // Build simulator payload
            const payload = await simulatorFormatter.buildSimulatorPayload(req, options.templatePath)

            // Debug logging
            if (options.debug) {
              console.log(`🔄 Integrated proxy handling: ${req.method} ${req.path}`)
            }

            // Send to simulator API
            const simulatorResponse = await options.nimbuClient.simulatorRender(payload)

            // Process response (using ResponseProcessor from proxy-server)
            const { ResponseProcessor } = require('@nimbu-cli/proxy-server')
            ResponseProcessor.processResponse(simulatorResponse, res)

            // Log response status (similar to dual server mode with colors)
            const chalk = require('chalk')
            const statusCode = simulatorResponse.statusCode || 200
            const coloredStatus =
              statusCode >= 200 && statusCode < 300
                ? chalk.green(`(${statusCode})`)
                : statusCode >= 400
                ? chalk.red(`(${statusCode})`)
                : chalk.yellow(`(${statusCode})`)
            console.log(`${timestamp} ${req.method} ${req.path} ${coloredStatus}`)
          } catch (error) {
            const chalk = require('chalk')
            console.error(
              `${timestamp} ${req.method} ${req.path} ${chalk.red('(ERROR:')} ${error.message}${chalk.red(')')}`,
            )
            const { ResponseProcessor } = require('@nimbu-cli/proxy-server')
            ResponseProcessor.handleError(error, res)
          }
        })().catch((err) => {
          console.error('Unhandled error in integrated proxy middleware:', err)
          const { ResponseProcessor } = require('@nimbu-cli/proxy-server')
          ResponseProcessor.handleError(err, res)
        })
      })

      return middlewares
    }
  }

  return {
    // WebpackDevServer 2.4.3 introduced a security fix that prevents remote
    // websites from potentially accessing local content through DNS rebinding:
    // https://github.com/webpack/webpack-dev-server/issues/887
    // https://medium.com/webpack/webpack-dev-server-middleware-security-issues-1489d950874a
    // However, it made several existing use cases such as development in cloud
    // environment or subdomains in development significantly more complicated:
    // https://github.com/facebook/create-react-app/issues/2271
    // https://github.com/facebook/create-react-app/issues/2233
    // While we're investigating better solutions, for now we will take a
    // compromise. Since our WDS configuration only serves files in the `public`
    // folder we won't consider accessing them a vulnerability. However, if you
    // use the `proxy` feature, it gets more dangerous because it can expose
    // remote code execution vulnerabilities in backends like Django and Rails.
    // So we will disable the host check normally, but enable it if you have
    // specified the `proxy` setting. Finally, we let you override it if you
    // really know what you're doing with a special environment variable.
    // Note: ["localhost", ".localhost"] will support subdomains - but we might
    // want to allow setting the allowedHosts manually for more complex setups
    allowedHosts: disableFirewall ? 'all' : allowedHosts,
    client: {
      overlay: {
        errors: true,
        warnings: false,
      },
      logging: 'verbose',
      webSocketURL: {
        // Enable custom sockjs pathname for websocket connection to hot reloading server.
        // Enable custom sockjs hostname, pathname and port for websocket connection
        // to hot reloading server.
        hostname: sockHost,
        pathname: sockPath,
        port: sockPort,
      },
    },
    // Enable Hot Module Replacement
    hot: true,
    // Enable live reloading as fallback
    liveReload: true,
    // Enable gzip compression of generated files.
    compress: true,
    devMiddleware: {
      // It is important to tell WebpackDevServer to use the same "publicPath" path as
      // we specified in the webpack config. When homepage is '.', default to serving
      // from the root.
      // remove last slash so user can land on `/test` instead of `/test/`
      publicPath: paths.publicUrlOrPath.slice(0, -1),
    },
    headers: {
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Origin': '*',
    },
    historyApiFallback: {
      // Paths with dots should still use the history fallback.
      // See https://github.com/facebook/create-react-app/issues/387.
      disableDotRule: true,
      index: paths.publicUrlOrPath,
    },

    host,
    https: getHttpsConfig(),
    // `proxy` is run between `before` and `after` `webpack-dev-server` hooks
    // Only include proxy if it's not null to avoid webpack-dev-server validation errors
    ...(proxy && { proxy }),
    static: {
      // By default WebpackDevServer serves physical files from current directory
      // in addition to all the virtual build products that it serves from memory.
      // This is confusing because those files won’t automatically be available in
      // production build folder unless we copy them. However, copying the whole
      // project directory is dangerous because we may expose sensitive files.
      // Instead, we establish a convention that only files in `public` directory
      // get served. Our build script will copy `public` into the `build` folder.
      // In `index.html`, you can get URL of `public` folder with %PUBLIC_URL%:
      // <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
      // In JavaScript code, you can access it with `process.env.PUBLIC_URL`.
      // Note that we only recommend to use `public` folder as an escape hatch
      // for files like `favicon.ico`, `manifest.json`, and libraries that are
      // for some reason broken when imported through webpack. If you just want to
      // use an image, put it in `src` and `import` it from JavaScript instead.
      directory: paths.appPublic,
      publicPath: [paths.publicUrlOrPath],
      serveIndex: false,
      // By default files from `contentBase` will not trigger a page reload.
      watch: {
        // Reportedly, this avoids CPU overload on some systems.
        // https://github.com/facebook/create-react-app/issues/293
        // src/node_modules is not ignored to support absolute imports
        // https://github.com/facebook/create-react-app/issues/1065
        ignored: ignoredFiles(paths.appSrc),
      },
    },
    ...(setupMiddlewares && { setupMiddlewares }),
  }
}
