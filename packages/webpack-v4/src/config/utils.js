const autoprefixer = require('autoprefixer')
const _ = require('lodash')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const {
  buildConfig: { get: getProjectConfig },
} = require('@nimbu-cli/command')

const getCacheIdentifier = require('react-dev-utils/getCacheIdentifier')

const optionals = {}

function resolveOptional(moduleName) {
  try {
    optionals[moduleName] = require.resolve(moduleName)
  } catch (error) {
    optionals[moduleName] = false
  }
}

function getOptional(moduleName) {
  if (optionals[moduleName] == null) {
    resolveOptional(moduleName)
  }
  return optionals[moduleName]
}

function hasOptional(moduleName) {
  return getOptional(moduleName) !== false
}

function babelLoader(loaderOptions = {}) {
  const config = getProjectConfig()
  const options = {
    babelrc: true,
    cacheDirectory: true,
    cacheIdentifier: getCacheIdentifier(loaderOptions.cachePrefix || 'app-js', [
      'babel-plugin-named-asset-import',
      'babel-preset-react-app',
      'react-dev-utils',
      'react-scripts',
    ]),
    presets: ['react-app'],
  }
  options.plugins = [
    [
      require.resolve('babel-plugin-root-import'),
      {
        rootPathSuffix: 'src',
      },
    ],
    require.resolve('@babel/plugin-proposal-optional-chaining'),
    require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
  ]
  if (config.REACT && hasOptional('react-hot-loader/babel')) {
    options.plugins.push(require.resolve('react-hot-loader/babel'))
  }
  if (options.enableReactRefresh && config.REACT && hasOptional('react-refresh/babel')) {
    options.plugins.push(require.resolve('react-refresh/babel'))
  }
  return {
    loader: require.resolve('babel-loader'),
    options,
  }
}

function codeLoaders(options) {
  const loaders = [
    {
      exclude: /node_modules/,
      test: /\.coffee$/,
      use: require.resolve('coffee-loader'),
    },
    {
      // Application JS
      // exclude node modules, except our own polyfills
      exclude: /node_modules(?!.*nimbu-toolbelt\/polyfills\.js)/,
      test: /\.jsx?$/,
      use: [babelLoader(options)],
    },
    // Process any JS outside of the app with Babel.
    // Unlike the application JS, we only compile the standard ES features.
    {
      exclude: /@babel(?:\/|\\{1,2})runtime|alpinejs/,
      loader: require.resolve('babel-loader'),
      /* tslint:disable:object-literal-sort-keys */
      options: {
        babelrc: true,
        configFile: false,
        compact: false,
        presets: [[require.resolve('babel-preset-react-app/dependencies'), { helpers: true }]],
        cacheDirectory: true,
        // See create-react-app#6846 for context on why cacheCompression is disabled
        cacheCompression: false,
        cacheIdentifier: getCacheIdentifier(options.cachePrefix || 'non-app-js', [
          'babel-plugin-named-asset-import',
          'babel-preset-react-app',
          'react-dev-utils',
          'react-scripts',
        ]),
        // Babel sourcemaps are needed for debugging into node_modules
        // code.  Without the options below, debuggers like VSCode
        // show incorrect code and set breakpoints on the wrong lines.
        sourceMaps: options.shouldUseSourceMap,
        inputSourceMap: options.shouldUseSourceMap,
      },
      /* tslint:enable:object-literal-sort-keys */
      test: /\.(js|mjs)$/,
    },
  ]

  if (hasOptional('ts-loader')) {
    loaders.push({
      exclude: /node_modules/,
      test: /\.tsx?$/,
      use: [
        babelLoader(options),
        {
          loader: getOptional('ts-loader'),
          options: {
            transpileOnly: true,
            compilerOptions: {
              noEmit: false,
            },
          },
        },
      ],
    })
  }
  return loaders
}

const fileloader = require.resolve('file-loader')
const fileloaderOutputPath = (name) => {
  let basename = name.split('?h=')[0]
  return `${basename}`
}

function fileLoaders(options = {}) {
  const config = getProjectConfig()
  const loaders = [
    {
      loader: fileloader,
      options: {
        name: 'fonts/[name].[ext]?h=[hash:8]',
        outputPath: fileloaderOutputPath,
        publicPath: options.publicPath || '/',
        esModule: false,
      },
      test: [/\.(eot|otf|woff|woff2|ttf)(\?\S*)?$/, /fonts.*\.svg(\?\S*)?$/],
    },
    {
      // Exclude `js` files to keep "css" loader working as it injects
      // it's runtime that would otherwise processed through "file" loader.
      // Also exclude `html` and `json` extensions so they get processed
      // by webpacks internal loaders.
      exclude: [/\.jsx?$/, /\.html$/, /\.json$/, /\.ejs$/, /\.tsx?$/],
      loader: fileloader,
      options: {
        name: 'images/[name].[ext]?h=[hash:8]',
        outputPath: fileloaderOutputPath,
        publicPath: options.publicPath || '/',
        esModule: false,
      },
    },
  ]
  if (config.REACT && config.SVG_LOADER_INCLUDE != null) {
    loaders.splice(0, 0, {
      include: config.SVG_LOADER_INCLUDE,
      test: /\.svg$/,
      use: [
        babelLoader(options),
        {
          loader: require.resolve('./svg-loader.js'),
          options: config.SVG_LOADER_OPTIONS || {},
        },
      ],
    })
  }
  return loaders
}

function styleLoaders(options) {
  return [
    {
      loader: require.resolve('css-loader'),
      options: {
        importLoaders: 2,
        minimize: false, // We use CssoWebpackPlugin later on
        sourceMap: options.shouldUseSourceMap,
      },
    },
    {
      loader: require.resolve('postcss-loader'),
      options: {
        // Necessary for external CSS imports to work
        // https://github.com/facebookincubator/create-react-app/issues/2677
        ident: 'postcss',
        plugins: () => [
          require('postcss-flexbugs-fixes'),
          autoprefixer({
            flexbox: 'no-2009',
          }),
        ],
      },
    },
    {
      loader: require.resolve('sass-loader'),
    },
  ]
}

const extractTextPluginOptions = {
  publicPath: '/stylesheets',
}

function styleConfigWithExtraction(options) {
  return {
    loaders: [
      {
        test: /.s?css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: extractTextPluginOptions,
          },
        ].concat(styleLoaders(options)),
      },
    ],
    plugins: [
      // extract css into its own file
      new MiniCssExtractPlugin({
        filename: 'stylesheets/[name].css',
      }),
    ],
  }
}

function styleConfigWithoutExtraction(options) {
  return {
    loaders: [
      {
        test: /.s?css$/,
        use: [require.resolve('style-loader')].concat(styleLoaders(options)),
      },
    ],
    plugins: [],
  }
}

function styleConfig(options) {
  if (options.shouldExtractCSS) {
    return styleConfigWithExtraction(options)
  } else {
    return styleConfigWithoutExtraction(options)
  }
}

function htmlWebPackPlugins(entries, options = {}) {
  const template = require.resolve('../../template/webpack.liquid.ejs')
  return entries.map((entry) => {
    const name = entry.toLowerCase()
    return new HtmlWebpackPlugin({
      alwaysWriteToDisk: options.alwaysWriteToDisk,
      chunks: [entry],
      chunksSortMode: 'auto',
      filename: `snippets/webpack_${name}.liquid`,
      inject: false,
      template: template,
      templateParameters: {
        prefix: `${name}_`,
      },
    })
  })
}

function tsWebpackPlugins(options = {}) {
  const plugins = []

  // WIP: works first time, second time feedback seems swallowed by webpack clearing the screen each compile

  // if (hasOptional('ts-loader')) {
  //   if (hasOptional('fork-ts-checker-webpack-plugin')) {
  //     const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin')
  //     plugins.push(
  //       new ForkTsCheckerWebpackPlugin(
  //         options.production
  //           ? {
  //               async: false,
  //               useTypescriptIncrementalApi: true,
  //               memoryLimit: 4096,
  //             }
  //           : {
  //               eslint: true,
  //             },
  //       ),
  //     )
  //   }
  //   if (hasOptional('fork-ts-checker-notifier-webpack-plugin') && !options.production) {
  //     const ForkTsCheckerNotifierWebpackPlugin = require('fork-ts-checker-notifier-webpack-plugin')
  //     plugins.push(new ForkTsCheckerNotifierWebpackPlugin({ title: 'TypeScript', excludeWarnings: false }))
  //   }
  // }

  return plugins
}

function getNodeVersions() {
  const m = process.version.match(/(\d+)\.(\d+)\.(\d+)/);
  const [major, minor, patch] = m.slice(1).map(_ => parseInt(_));

  return { major, minor, patch };
}

module.exports = {
  codeLoaders,
  fileLoaders,
  getNodeVersions,
  getOptional,
  hasOptional,
  htmlWebPackPlugins,
  styleConfig,
  styleLoaders,
  tsWebpackPlugins,
}
