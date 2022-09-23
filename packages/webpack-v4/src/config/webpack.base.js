const path = require('path')
const webpack = require('webpack')
const paths = require('./paths')
const { hasOptional } = require('./utils')

const {
  buildConfig: { get: getProjectConfig },
} = require('@nimbu-cli/command')

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
      hasOptional('jquery') &&
        new webpack.ProvidePlugin({
          $: require.resolve('jquery'),
          jQuery: require.resolve('jquery'),
          'window.jQuery': require.resolve('jquery'),
        }),
    ].filter(Boolean),
    resolve: {
      extensions: ['.js', '.jsx', '.coffee', '.ts', '.tsx'],
    },
  }
}

module.exports = config
