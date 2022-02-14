const merge = require('webpack-merge')
const webpack = require('webpack')
const getBaseWebpackConfig = require('./webpack.base.js')
const utils = require('./utils')
const FriendlyErrorsPlugin = require('friendly-errors-webpack-plugin')
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin')
const {
  buildConfig: { get: getProjectConfig },
} = require('@nimbu-cli/command')

let ReactRefreshWebpackPlugin

try {
  ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin')
} catch (error) {
  // ILB
}

const webpackConfig = () => {
  const baseWebpackConfig = getBaseWebpackConfig()
  const config = getProjectConfig()
  const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'
  const shouldExtractCSS = process.env.EXTRACT_CSS === 'true'

  // add hot-reload related code to entry chunks
  Object.keys(baseWebpackConfig.entry).forEach(function (name) {
    let extras = [require.resolve('webpack-dev-server/client') + '?/', require.resolve('webpack/hot/dev-server')]
    if (config.REACT) {
      extras.splice(0, 0, require.resolve('core-js/modules/es.symbol'))
    }
    baseWebpackConfig.entry[name] = extras.concat(baseWebpackConfig.entry[name])
  })

  const styleConfig = utils.styleConfig({ shouldUseSourceMap, shouldExtractCSS })

  const loaders = utils
    .codeLoaders({
      cachePrefix: 'development',
      enableReactRefresh: true,
      shouldUseSourceMap,
    })
    .concat(styleConfig.loaders)
    .concat(
      utils.fileLoaders({
        cachePrefix: 'development',
      }),
    )

  const plugins = [
    new webpack.DefinePlugin({
      DEBUG: 'true',
      'process.env': {
        NODE_ENV: JSON.stringify('development'),
      },
    }),
    ...utils.tsWebpackPlugins(),
    ...styleConfig.plugins,
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new FriendlyErrorsPlugin(),
    ...utils.htmlWebPackPlugins(Object.keys(baseWebpackConfig.entry), { alwaysWriteToDisk: true }),
    new HtmlWebpackHarddiskPlugin(),
  ]

  if (ReactRefreshWebpackPlugin != null) {
    plugins.push(new ReactRefreshWebpackPlugin())
  }

  return merge(baseWebpackConfig, {
    devtool: 'cheap-module-source-map',
    mode: 'development',
    module: {
      rules: [
        {
          oneOf: loaders,
        },
      ],
    },
    plugins,
  })
}

module.exports = webpackConfig
