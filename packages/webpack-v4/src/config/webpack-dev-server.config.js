'use strict'

process.traceDeprecation = true

const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware')
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware')
const path = require('node:path')

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

// This configuration is inspired by the one from create-react-app (after ejecting)
// eslint-disable-next-line max-params
module.exports = function (proxy, allowedHost, host, protocol, options = {}) {
  const useIntegratedProxy = options.integratedProxy && ProxyServer && options.nimbuClient
  
  const result = {
    allowedHosts: ['localhost', '.localhost'],
    // Silence WebpackDevServer's own logs since they're generally not useful.
    before(app) {
      // Add integrated proxy middleware if enabled
      if (useIntegratedProxy) {
        const express = require('express')
        const cors = require('cors')
        const compression = require('compression')
        const helmet = require('helmet')
        
        // Initialize proxy server components
        const templatePacker = new TemplatePacker(options.templatePath || process.cwd())
        const simulatorFormatter = new SimulatorFormatter(templatePacker)
        
        // Add security middleware
        app.use(helmet({
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false,
        }))
        
        // Add CORS middleware
        app.use(cors({
          credentials: true,
          origin: true,
        }))
        
        // Add compression
        app.use(compression())
        
        // Add unified body parsing middleware for v3 simulator
        app.use((req, res, next) => {
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
        
        // Add proxy server request handler
        app.use((req, res, next) => {
          // Skip webpack dev server resources and static assets
          if (req.path.includes('/__webpack') || 
              req.path.includes('/sockjs-node') ||
              req.path.includes('.hot-update.') ||
              req.path === '/webpack.stats.json') {
            return next()
          }
          
          // Check if request should be handled by simulator
          if (!SimulatorFormatter.shouldHandleRequest(req)) {
            return next()
          }
          
          // Process request with integrated proxy logic
          (async () => {
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
            } catch (error) {
              console.error('Integrated proxy error:', error.message)
              const { ResponseProcessor } = require('@nimbu-cli/proxy-server')
              ResponseProcessor.handleError(error, res)
            }
          })()
        })
      }
      
      // Add default webpack dev server middleware
      app.use(errorOverlayMiddleware())
      app.use(noopServiceWorkerMiddleware())
    },
    // It will still show compile warnings and errors with this setting.
    clientLogLevel: 'none',
    // Enable gzip compression of generated files.
    compress: true,
    // Make sure everything webpack doesn't know of is proxied.
    contentBase: false,
    disableHostCheck: !proxy,
    historyApiFallback: {
      disableDotRule: true,
    },
    host,
    hot: true,
    https: protocol === 'https',
    overlay: false,
    // Only include proxy if it's not null to avoid webpack-dev-server validation errors
    ...(proxy && { proxy }),
    public: allowedHost,
    publicPath: '/',
    quiet: true,
    watchOptions: {
      ignored: new RegExp(
        `^(?!${path.normalize('./src/').replaceAll(/\\+/g, '\\\\')}).+[\\\\/]node_modules[\\\\/]`,
        'g',
      ),
    },
  }
  if (options.poll) {
    result.watchOptions.poll = true
  }

  return result
}
