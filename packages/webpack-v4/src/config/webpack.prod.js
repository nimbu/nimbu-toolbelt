const webpack = require('webpack')
const merge = require('webpack-merge')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')

const getBaseWebpackConfig = require('./webpack.base.js')
const utils = require('./utils')
const {
  buildConfig: { get: getProjectConfig },
} = require('@nimbu-cli/command')

const webpackConfig = () => {
  const config = getProjectConfig()
  const baseWebpackConfig = getBaseWebpackConfig()
  const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'
  const shouldExtractCSS = true

  const styleConfig = utils.styleConfig({ shouldExtractCSS, shouldUseSourceMap })

  const loaders = utils
    .codeLoaders({
      cachePrefix: 'production',
      shouldUseSourceMap,
    })
    .concat(styleConfig.loaders)
    .concat(
      utils.fileLoaders({
        cachePrefix: 'production',
        publicPath: config.CDN_ROOT || '../',
      }),
    )
  return merge(baseWebpackConfig, {
    devtool: shouldUseSourceMap ? 'source-map' : undefined,
    mode: 'production',
    module: {
      rules: [
        {
          oneOf: loaders,
        },
      ],
    },
    optimization: {
      minimize: true,
      minimizer: [
        new CssMinimizerPlugin(),
        new TerserPlugin({
          terserOptions: {
            ie8: false,
            safari10: false,
            sourceMap: shouldUseSourceMap,
          },
        }),
      ],
      removeEmptyChunks: true,
      splitChunks: {
        cacheGroups: {
          polyfills: {
            chunks: 'initial',
            name: 'polyfills',
            priority: 10,
            test(module) {
              return (
                /css/.test(module.type) === false &&
                module.context &&
                (module.context.includes('node_modules/core-js') ||
                  module.context.includes('node_modules/regenerator-runtime'))
              )
            },
          },
          vendor: {
            chunks: 'initial',
            name: 'vendor',
            priority: 0,
            test(module) {
              return (
                /css/.test(module.type) === false &&
                module.context &&
                (module.context.includes('node_modules') || module.context.includes('src/vendor'))
              )
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
      ...utils.tsWebpackPlugins({ production: true }),
      ...styleConfig.plugins,
      ...utils.htmlWebPackPlugins(Object.keys(baseWebpackConfig.entry)),
    ],
  })
}

module.exports = webpackConfig
