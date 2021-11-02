'use strict'

process.traceDeprecation = true

const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware')
const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware')
const path = require('path')

// This configuration is inspired by the one from create-react-app (after ejecting)
module.exports = function (proxy, allowedHost, host, protocol, options = {}) {
  const result = {
    allowedHosts: ['localhost', '.localhost'],
    // Silence WebpackDevServer's own logs since they're generally not useful.
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
    host: host,
    hot: true,
    https: protocol === 'https',
    overlay: false,
    proxy,
    public: allowedHost,
    publicPath: '/',
    quiet: true,
    watchOptions: {
      ignored: new RegExp(
        `^(?!${path.normalize('./src' + '/').replace(/[\\]+/g, '\\\\')}).+[\\\\/]node_modules[\\\\/]`,
        'g',
      ),
    },
    before(app) {
      app.use(errorOverlayMiddleware())
      app.use(noopServiceWorkerMiddleware())
    },
  }
  if (options.poll) {
    result.watchOptions.poll = true
  }
  return result
}
