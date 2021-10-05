const path = require('path')
const webpack = require('webpack')

const paths = require('./paths')
const {
  config: { get: getProjectConfig },
} = require('nimbu')

// the order for entries is important: first load javascript, next load the css - as you probably want to cascadingly override stuff from libraries
const config = () => {
  const projectConfig = getProjectConfig()
  let entry = projectConfig.WEBPACK_ENTRY
  if (entry == null) {
    const cssEntry = projectConfig.CSS_ENTRY != null ? projectConfig.CSS_ENTRY : 'index.scss'
    const jsEntry = projectConfig.JS_ENTRY != null ? projectConfig.JS_ENTRY : 'index.js'
    entry = {
      app: [
        path.resolve(paths.NIMBU_DIRECTORY, `src/${jsEntry}`),
        path.resolve(paths.NIMBU_DIRECTORY, `src/${cssEntry}`),
      ],
    }
  }
  return {
    entry,
    module: {
      strictExportPresence: true,
    },
    output: {
      filename: 'javascripts/[name].js',
      path: paths.NIMBU_DIRECTORY,
      publicPath: '/',
    },
    plugins: [
      new webpack.ProvidePlugin({
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.coffee', '.ts', '.tsx'],
    },
  }
}

module.exports = config
