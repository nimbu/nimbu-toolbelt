const webpack = require('webpack')
const merge = require('webpack-merge')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const baseWebpackConfig = require('./webpack.base.js')
const utils = require('./utils')
const config = require('./config')

const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'
const shouldExtractCSS = true

const styleConfig = utils.styleConfig({ shouldUseSourceMap, shouldExtractCSS })

const loaders = utils
  .codeLoaders()
  .concat(styleConfig.loaders)
  .concat(
    utils.fileLoaders({
      publicPath: config.CDN_ROOT || '../',
    }),
  )

const webpackConfig = merge(baseWebpackConfig, {
  mode: 'production',
  module: {
    rules: [
      {
        oneOf: loaders,
      },
    ],
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        sourceMap: shouldUseSourceMap,
        uglifyOptions: {
          compress: {
            comparisons: false,
            drop_console: true,
            warnings: false,
          },
          mangle: true,
          output: {
            ascii_only: true,
            comments: false,
          },
        },
      }),
    ],
    splitChunks: {
      cacheGroups: {
        vendor: {
          chunks: 'all',
          name: 'vendor',
          test: function(module) {
            // This prevents stylesheet resources with the .css or .scss extension
            // from being moved from their original chunk to the vendor chunk
            if (module.resource && /^.*\.(css|scss)$/.test(module.resource)) {
              return false
            }
            return module.context && (module.context.includes('node_modules') || module.context.includes('src/vendor'))
          },
        },
      },
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      DEBUG: 'false',
      'process.env': {
        NODE_ENV: JSON.stringify('production'),
      },
    }),
    ...styleConfig.plugins,
    ...utils.htmlWebPackPlugins(Object.keys(baseWebpackConfig.entry)),
  ],
})

module.exports = webpackConfig
