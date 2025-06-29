/* eslint-disable perfectionist/sort-objects */
'use strict'

const {
  buildConfig: { get: getProjectConfig },
} = require('@nimbu-cli/command')

const fs = require('node:fs')
const path = require('node:path')
const webpack = require('webpack')
const resolve = require('resolve')
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackHarddiskPlugin = require('html-webpack-harddisk-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const WorkboxWebpackPlugin = require('workbox-webpack-plugin')
const ModuleScopePlugin = require('react-dev-utils/ModuleScopePlugin')
const getCSSModuleLocalIdent = require('react-dev-utils/getCSSModuleLocalIdent')
const ESLintPlugin = require('eslint-webpack-plugin')
const paths = require('./paths')
const modules = require('./modules')
const getClientEnvironment = require('./env')
const ModuleNotFoundPlugin = require('react-dev-utils/ModuleNotFoundPlugin')
const ForkTsCheckerWebpackPlugin =
  process.env.TSC_COMPILE_ON_ERROR === 'true'
    ? require('react-dev-utils/ForkTsCheckerWarningWebpackPlugin')
    : require('react-dev-utils/ForkTsCheckerWebpackPlugin')

const createEnvironmentHash = require('./persistentCache/createEnvironmentHash')
const { hasOptional } = require('./utils')

// Source maps are resource heavy and can cause out of memory issue for large source files.
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false'

const reactRefreshRuntimeEntry = hasOptional('react-refresh/runtime') && require.resolve('react-refresh/runtime')

const ReactRefreshName = '@pmmmwh/react-refresh-webpack-plugin'
const ReactRefreshWebpackPlugin = hasOptional(ReactRefreshName) && require(ReactRefreshName)
const reactRefreshWebpackPluginRuntimeEntry = hasOptional(ReactRefreshName) && require.resolve(ReactRefreshName)

const babelRuntimeEntry = require.resolve('babel-preset-react-app')
const babelRuntimeEntryHelpers = require.resolve('@babel/runtime/helpers/esm/assertThisInitialized', {
  paths: [babelRuntimeEntry],
})
const babelRuntimeRegenerator = require.resolve('@babel/runtime/regenerator', {
  paths: [babelRuntimeEntry],
})

const emitErrorsAsWarnings = process.env.ESLINT_NO_DEV_ERRORS === 'true'
const disableESLintPlugin = process.env.DISABLE_ESLINT_PLUGIN === 'true'

const imageInlineSizeLimit = Number.parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT || '10000', 10) // smaller then 10000 bytes will be inlined as data url

// Check if TypeScript is setup
const useTypeScript = fs.existsSync(paths.appTsConfig)

// Helper function to check if tailwindcss is a dependency
const hasTailwindCSS = () => {
  try {
    require.resolve('tailwindcss')
    return true
  } catch {
    return false
  }
}

// Check if Tailwind config exists and find  the tailwind version
const useTailwind = hasTailwindCSS()
let tailwindPostCssPackage = 'tailwindcss'

if (useTailwind) {
  // eslint-disable-next-line node/no-missing-require
  const { version } = require('tailwindcss/package.json')
  if (Number.parseInt(version.split('.')[0], 10) >= 4) {
    tailwindPostCssPackage = '@tailwindcss/postcss'
  }
}

// Get the path to the uncompiled service worker (if it exists).
const { swSrc } = paths

// style files regexes
const cssRegex = /\.css$/
const cssModuleRegex = /\.module\.css$/
const sassRegex = /\.(scss|sass)$/
const sassModuleRegex = /\.module\.(scss|sass)$/

const hasJsxRuntime = (() => {
  if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
    return false
  }

  try {
    require.resolve('react/jsx-runtime')
    return true
  } catch {
    return false
  }
})()

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
      template,
      templateParameters: {
        cdnRoot: options.cdnRoot,
        prefix: `${name}_`,
      },
    })
  })
}

function ensureTrailingSlash(url) {
  return url.endsWith('/') ? url : `${url}/`
}

// This is the production and development configuration.
// It is focused on developer experience, fast rebuilds, and a minimal bundle.

// webpackEnv is either 'development' or 'production'
module.exports = function (webpackEnv) {
  const projectConfig = getProjectConfig() ?? {}
  const { NIMBU_DIRECTORY } = paths

  const defaultEntryCssEntry = projectConfig.CSS_ENTRY ?? 'index.scss'
  const defaultEntryJsEntry = projectConfig.JS_ENTRY ?? 'index.js'
  const defaultEntry = {
    app: [
      path.resolve(NIMBU_DIRECTORY, `src/${defaultEntryCssEntry}`),
      path.resolve(NIMBU_DIRECTORY, `src/${defaultEntryJsEntry}`),
    ],
  }
  const entry = projectConfig.WEBPACK_ENTRY ?? defaultEntry

  const isEnvDevelopment = webpackEnv === 'development'
  const isEnvProduction = webpackEnv === 'production'

  // Variable used for enabling profiling in Production
  // passed into alias object. Uses a flag if passed into the build command
  const isEnvProductionProfile = isEnvProduction && process.argv.includes('--profile')

  // Support for legacy custom svg loaders
  const shouldUseCustomSVGLoader = projectConfig.SVG_LOADER_INCLUDE != null
  const publicUrlOrPath = ensureTrailingSlash(
    isEnvProduction ? projectConfig.CDN_ROOT ?? process.env.PUBLIC_URL ?? '../' : '/',
  )
  // We will provide `paths.publicUrlOrPath` to our app
  // as %PUBLIC_URL% in `index.html` and `process.env.PUBLIC_URL` in JavaScript.
  // Omit trailing slash as %PUBLIC_URL%/xyz looks better than %PUBLIC_URL%xyz.
  // Get environment variables to inject into our app.
  const env = getClientEnvironment(publicUrlOrPath)

  const shouldUseReactRefresh = hasOptional(ReactRefreshName) && env.raw.FAST_REFRESH

  // common function to get style loaders
  const getStyleLoaders = (cssOptions, preProcessor) => {
    const loaders = [
      isEnvDevelopment && {
        loader: require.resolve('style-loader'),
        options: {
          // Enable HMR for CSS - use styleTag for better HMR with Tailwind v4
          injectType: 'styleTag',
        },
      },
      isEnvProduction && {
        loader: MiniCssExtractPlugin.loader,
        options: { publicPath: publicUrlOrPath },
      },
      {
        loader: require.resolve('css-loader'),
        options: cssOptions,
      },
      {
        // Options for PostCSS as we reference these options twice
        // Adds vendor prefixing based on your specified browser support in
        // package.json
        loader: require.resolve('postcss-loader'),
        options: {
          postcssOptions: {
            // Necessary for external CSS imports to work
            // https://github.com/facebook/create-react-app/issues/2677
            config: false,
            ident: 'postcss',
            plugins: useTailwind
              ? [
                  [
                    require.resolve(tailwindPostCssPackage),
                    {
                      // Force Tailwind to reprocess @apply directives on file changes
                      content: [
                        './src/**/*.{js,jsx,ts,tsx,html,liquid}',
                        './templates/**/*.liquid',
                        './snippets/**/*.liquid', 
                        './layout/**/*.liquid',
                        './sections/**/*.liquid',
                        './assets/**/*.scss',
                        './src/**/*.scss',
                        './src/**/*.css'
                      ]
                    }
                  ],
                  require.resolve('postcss-nesting'),
                  require.resolve('postcss-flexbugs-fixes'),
                  [
                    require.resolve('postcss-preset-env'),
                    {
                      autoprefixer: {
                        flexbox: 'no-2009',
                      },
                      stage: 3,
                    },
                  ],
                ]
              : [
                  require.resolve('postcss-flexbugs-fixes'),
                  [
                    require.resolve('postcss-preset-env'),
                    {
                      autoprefixer: {
                        flexbox: 'no-2009',
                      },
                      stage: 3,
                    },
                  ],
                  // Adds PostCSS Normalize as the reset css with default options,
                  // so that it honors browserslist config in package.json
                  // which in turn let's users customize the target behavior as per their needs.
                  require.resolve('postcss-normalize'),
                ],
          },
          sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
        },
      },
    ].filter(Boolean)

    const { appSrc } = paths

    if (preProcessor) {
      loaders.push(
        {
          loader: require.resolve('resolve-url-loader'),
          options: {
            root: appSrc,
            sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
          },
        },
        {
          loader: require.resolve(preProcessor),
          options: {
            sourceMap: true,
          },
        },
      )
    }

    return loaders
  }

  return {
    target: ['browserslist'],
    mode: isEnvProduction ? 'production' : isEnvDevelopment && 'development',
    // Stop compilation early in production
    bail: isEnvProduction,
    devtool: isEnvProduction
      ? shouldUseSourceMap
        ? 'source-map'
        : false
      : isEnvDevelopment && 'cheap-module-source-map',
    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    entry,
    output: {
      // The build folder.
      path: paths.appBuild,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: isEnvDevelopment,
      // There will be one main bundle, and one file per asynchronous chunk.
      // In development, it does not produce real files.
      filename: 'javascripts/[name].js',
      assetModuleFilename: 'images/[name][ext]',
      // webpack uses `publicPath` to determine where the app is being served from.
      // It requires a trailing slash, or the file assets will get an incorrect path.
      // We inferred the "public path" (such as / or /my-project) from homepage.
      publicPath: publicUrlOrPath,
      // Point sourcemap entries to original disk location (format as URL on Windows)
      devtoolModuleFilenameTemplate: isEnvProduction
        ? (info) => path.relative(paths.appSrc, info.absoluteResourcePath).replaceAll('\\', '/')
        : isEnvDevelopment && ((info) => path.resolve(info.absoluteResourcePath).replaceAll('\\', '/')),
    },
    cache: {
      type: 'filesystem',
      version: createEnvironmentHash(env.raw),
      cacheDirectory: paths.appWebpackCache,
      store: 'pack',
      buildDependencies: {
        defaultWebpack: ['webpack/lib/'],
        config: [__filename],
        tsconfig: [paths.appTsConfig, paths.appJsConfig].filter((f) => fs.existsSync(f)),
        // Add SCSS files to cache dependencies for proper HMR invalidation
        scss: ['src/**/*.scss', 'assets/**/*.scss'],
      },
    },
    infrastructureLogging: {
      level: 'none',
    },
    optimization: {
      minimize: isEnvProduction,
      minimizer: [
        // This is only used in production mode
        new TerserPlugin({
          extractComments: false, // do not output LICENSE.txt
          terserOptions: {
            parse: {
              // We want terser to parse ecma 8 code. However, we don't want it
              // to apply any minification steps that turns valid ecma 5 code
              // into invalid ecma 5 code. This is why the 'compress' and 'output'
              // sections only apply transformations that are ecma 5 safe
              // https://github.com/facebook/create-react-app/pull/4234
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              // Disabled because of an issue with Uglify breaking seemingly valid code:
              // https://github.com/facebook/create-react-app/issues/2376
              // Pending further investigation:
              // https://github.com/mishoo/UglifyJS2/issues/2011
              comparisons: false,
              // Disabled because of an issue with Terser breaking valid code:
              // https://github.com/facebook/create-react-app/issues/5250
              // Pending further investigation:
              // https://github.com/terser-js/terser/issues/120
              inline: 2,
            },
            mangle: {
              safari10: true,
            },
            // Added for profiling in devtools
            keep_classnames: isEnvProductionProfile,
            keep_fnames: isEnvProductionProfile,
            output: {
              ecma: 5,
              comments: false,
              // Turned on because emoji and regex is not minified properly using default
              // https://github.com/facebook/create-react-app/issues/2488
              ascii_only: true,
            },
          },
        }),
        // This is only used in production mode
        new CssMinimizerPlugin(),
      ],
      removeEmptyChunks: true,
      splitChunks: isEnvProduction
        ? {
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
          }
        : {},
    },
    resolve: {
      // This allows you to set a fallback for where webpack should look for modules.
      // We placed these paths second because we want `node_modules` to "win"
      // if there are any conflicts. This matches Node resolution mechanism.
      // https://github.com/facebook/create-react-app/issues/253
      modules: ['node_modules', paths.appNodeModules].concat(modules.additionalModulePaths || []),
      // These are the reasonable defaults supported by the Node ecosystem.
      // We also include JSX as a common component filename extension to support
      // some tools, although we do not recommend using it, see:
      // https://github.com/facebook/create-react-app/issues/290
      // `web` extension prefixes have been added for better support
      // for React Native Web.
      extensions: paths.moduleFileExtensions
        .map((ext) => `.${ext}`)
        .filter((ext) => useTypeScript || !ext.includes('ts')),
      alias: {
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
        // Allows for better profiling with ReactDevTools
        ...(isEnvProductionProfile && {
          'react-dom$': 'react-dom/profiling',
          'scheduler/tracing': 'scheduler/tracing-profiling',
        }),
        ...modules.webpackAliases,
      },
      plugins: [
        // Prevents users from importing files from outside of src/ (or node_modules/).
        // This often causes confusion because we only process files within src/ with babel.
        // To fix this, we prevent you from importing files out of src/ -- if you'd like to,
        // please link the files into your node_modules/ and let module-resolution kick in.
        // Make sure your source files are compiled, as they will not be processed in any way.
        new ModuleScopePlugin(
          paths.appSrc,
          [
            paths.appPackageJson,
            hasOptional('react-refresh/runtime') && reactRefreshRuntimeEntry,
            hasOptional(ReactRefreshName) && reactRefreshWebpackPluginRuntimeEntry,
            babelRuntimeEntry,
            babelRuntimeEntryHelpers,
            babelRuntimeRegenerator,
            require.resolve('script-loader'),
          ].filter(Boolean),
        ),
      ],
    },
    module: {
      strictExportPresence: true,
      rules: [
        // Handle node_modules packages that contain sourcemaps
        shouldUseSourceMap && {
          enforce: 'pre',
          exclude: /@babel(?:\/|\\{1,2})runtime/,
          test: /\.(js|mjs|jsx|ts|tsx|css)$/,
          loader: require.resolve('source-map-loader'),
        },
        {
          // "oneOf" will traverse all following loaders until one will
          // match the requirements. When no loader matches it will fall
          // back to the "file" loader at the end of the loader list.
          oneOf: [
            // "url" loader works like "file" loader except that it embeds assets
            // smaller than specified limit in bytes as data URLs to avoid requests.
            // A missing `test` is equivalent to a match.
            {
              test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.ico$/, /\.avif$/, /\.webp$/],
              type: 'asset',
              parser: {
                dataUrlCondition: {
                  maxSize: imageInlineSizeLimit,
                },
              },
              generator: {
                filename: 'images/[name][ext]?h=[contenthash:6]',
              },
            },
            {
              test: [/\.svg$/],
              type: 'asset',
              parser: {
                dataUrlCondition: {
                  maxSize: imageInlineSizeLimit,
                },
              },
              generator: {
                filename: 'images/[name][ext]?h=[contenthash:6]',
              },
              issuer: {
                and: [/\.(css|scss|sass)$/],
              },
            },
            {
              test: [/\.(eot|otf|woff|woff2|ttf)(\?\S*)?$/, /fonts.*\.svg(\?\S*)?$/],
              type: 'asset',
              parser: {
                dataUrlCondition: {
                  maxSize: imageInlineSizeLimit,
                },
              },
              generator: {
                filename: 'fonts/[name][ext]?h=[contenthash:6]',
              },
            },
            {
              test: /\.ejs$/,
              loader: require.resolve('ejs-loader'),
              options: {
                esModule: false,
              },
            },
            !shouldUseCustomSVGLoader && {
              test: /\.svg$/,
              use: [
                {
                  loader: require.resolve('@svgr/webpack'),
                  options: {
                    prettier: false,
                    svgo: false,
                    svgoConfig: {
                      plugins: [{ removeViewBox: false }],
                    },
                    titleProp: true,
                    ref: true,
                  },
                },
                {
                  loader: require.resolve('file-loader'),
                  options: {
                    name: 'images/[name].[ext]?h=[contenthash:6]',
                  },
                },
              ],
              issuer: {
                and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
              },
            },
            shouldUseCustomSVGLoader && {
              include: projectConfig.SVG_LOADER_INCLUDE,
              test: /\.svg$/,
              use: [
                require.resolve('babel-loader'),
                {
                  loader: require.resolve('./svg-loader.js'),
                  options: projectConfig.SVG_LOADER_OPTIONS ?? {},
                },
              ],
            },
            {
              exclude: /node_modules/,
              test: /\.coffee$/,
              use: ['coffee-loader'],
            },
            // Process application JS with Babel.
            // The preset includes JSX, Flow, TypeScript, and some ESnext features.
            {
              test: /\.(js|mjs|jsx|ts|tsx)$/,
              include: paths.appSrc,
              loader: require.resolve('babel-loader'),
              options: {
                customize: require.resolve('babel-preset-react-app/webpack-overrides'),
                presets: [
                  [
                    require.resolve('babel-preset-react-app'),
                    {
                      runtime: hasJsxRuntime ? 'automatic' : 'classic',
                    },
                  ],
                ],

                plugins: [
                  [
                    require.resolve('babel-plugin-root-import'),
                    {
                      rootPathSuffix: 'src',
                    },
                  ],
                  require.resolve('@babel/plugin-proposal-optional-chaining'),
                  require.resolve('@babel/plugin-proposal-nullish-coalescing-operator'),
                  isEnvDevelopment && shouldUseReactRefresh && require.resolve('react-refresh/babel'),
                ].filter(Boolean),
                // This is a feature of `babel-loader` for webpack (not Babel itself).
                // It enables caching results in ./node_modules/.cache/babel-loader/
                // directory for faster rebuilds.
                cacheDirectory: true,
                // See #6846 for context on why cacheCompression is disabled
                cacheCompression: false,
                compact: isEnvProduction,
              },
            },
            // Process any JS outside of the app with Babel.
            // Unlike the application JS, we only compile the standard ES features.
            {
              test: /\.(js|mjs)$/,
              exclude: /@babel(?:\/|\\{1,2})runtime/,
              loader: require.resolve('babel-loader'),
              options: {
                babelrc: false,
                configFile: false,
                compact: false,
                presets: [[require.resolve('babel-preset-react-app/dependencies'), { helpers: true }]],
                cacheDirectory: true,
                // See #6846 for context on why cacheCompression is disabled
                cacheCompression: false,

                // Babel sourcemaps are needed for debugging into node_modules
                // code.  Without the options below, debuggers like VSCode
                // show incorrect code and set breakpoints on the wrong lines.
                sourceMaps: shouldUseSourceMap,
                inputSourceMap: shouldUseSourceMap,
              },
            },
            // "postcss" loader applies autoprefixer to our CSS.
            // "css" loader resolves paths in CSS and adds assets as dependencies.
            // "style" loader turns CSS into JS modules that inject <style> tags.
            // In production, we use MiniCSSExtractPlugin to extract that CSS
            // to a file, but in development "style" loader enables hot editing
            // of CSS.
            // By default we support CSS Modules with the extension .module.css
            {
              test: cssRegex,
              exclude: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                modules: {
                  mode: 'icss',
                },
              }),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules (https://github.com/css-modules/css-modules)
            // using the extension .module.css
            {
              test: cssModuleRegex,
              use: getStyleLoaders({
                importLoaders: 1,
                sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                modules: {
                  mode: 'local',
                  getLocalIdent: getCSSModuleLocalIdent,
                },
              }),
            },
            // Opt-in support for SASS (using .scss or .sass extensions).
            // By default we support SASS Modules with the
            // extensions .module.scss or .module.sass
            {
              test: sassRegex,
              exclude: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 4, // Updated for postcss-nesting addition
                  sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                  modules: {
                    mode: 'icss',
                  },
                },
                'sass-loader',
              ),
              // Don't consider CSS imports dead code even if the
              // containing package claims to have no side effects.
              // Remove this when webpack adds a warning or an error for this.
              // See https://github.com/webpack/webpack/issues/6571
              sideEffects: true,
            },
            // Adds support for CSS Modules, but using SASS
            // using the extension .module.scss or .module.sass
            {
              test: sassModuleRegex,
              use: getStyleLoaders(
                {
                  importLoaders: 4, // Updated for postcss-nesting addition
                  sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                  modules: {
                    mode: 'local',
                    getLocalIdent: getCSSModuleLocalIdent,
                  },
                },
                'sass-loader',
              ),
            },
            // "file" loader makes sure those assets get served by WebpackDevServer.
            // When you `import` an asset, you get its (virtual) filename.
            // In production, they would get copied to the `build` folder.
            // This loader doesn't use a "test" so it will catch all modules
            // that fall through the other loaders.
            {
              // Exclude `js` files to keep "css" loader working as it injects
              // its runtime that would otherwise be processed through "file" loader.
              // Also exclude `html` and `json` extensions so they get processed
              // by webpacks internal loaders.
              exclude: [/^$/, /\.(js|mjs|jsx|ts|tsx)$/, /\.html$/, /\.json$/],
              type: 'asset/resource',
            },
            // ** STOP ** Are you adding a new loader?
            // Make sure to add the new loader(s) before the "file" loader.
          ].filter(Boolean),
        },
      ].filter(Boolean),
    },
    plugins: [
      // Generates an `index.html` file with the <script> injected.
      ...htmlWebPackPlugins(Object.keys(entry), { alwaysWriteToDisk: isEnvDevelopment, cdnRoot: publicUrlOrPath }),
      isEnvDevelopment && new HtmlWebpackHarddiskPlugin(),
      // This gives some necessary context to module not found errors, such as
      // the requesting resource.
      new ModuleNotFoundPlugin(paths.appPath),
      // Make backwards compatible with projects using jQuery
      hasOptional('jquery') &&
        new webpack.ProvidePlugin({
          $: require.resolve('jquery'),
          jQuery: require.resolve('jquery'),
          'window.jQuery': require.resolve('jquery'),
        }),
      // Makes some environment variables available to the JS code, for example:
      // if (process.env.NODE_ENV === 'production') { ... }. See `./env.js`.
      // It is absolutely essential that NODE_ENV is set to production
      // during a production build.
      // Otherwise React will be compiled in the very slow development mode.
      new webpack.DefinePlugin({
        ...env.stringified,
        'process.env.NODE_ENV': JSON.stringify(webpackEnv),
        'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG),
        'process.type': JSON.stringify(process.type),
        'process.version': JSON.stringify(process.version),
        DEBUG: isEnvDevelopment ? 'true' : 'false',
      }),
      // Experimental hot reloading for React .
      // https://github.com/facebook/react/tree/main/packages/react-refresh
      isEnvDevelopment &&
        shouldUseReactRefresh &&
        new ReactRefreshWebpackPlugin({
          overlay: false,
        }),
      // Enable Hot Module Replacement for CSS
      isEnvDevelopment && new webpack.HotModuleReplacementPlugin(),
      // Watcher doesn't work well if you mistype casing in a path so we use
      // a plugin that prints an error when you attempt to do this.
      // See https://github.com/facebook/create-react-app/issues/240
      isEnvDevelopment && new CaseSensitivePathsPlugin(),
      isEnvProduction &&
        new MiniCssExtractPlugin({
          // Options similar to the same options in webpackOptions.output
          // both options are optional
          filename: 'stylesheets/[name].css',
        }),
      // Moment.js is an extremely popular library that bundles large locale files
      // by default due to how webpack interprets its code. This is a practical
      // solution that requires the user to opt into importing specific locales.
      // https://github.com/jmblog/how-to-optimize-momentjs-with-webpack
      // You can remove this if you don't use Moment.js:
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/locale$/,
        contextRegExp: /moment$/,
      }),
      // Generate a service worker script that will precache, and keep up to date,
      // the HTML & assets that are part of the webpack build.
      isEnvProduction &&
        fs.existsSync(swSrc) &&
        new WorkboxWebpackPlugin.InjectManifest({
          swSrc,
          dontCacheBustURLsMatching: /\.[\da-f]{8}\./,
          exclude: [/\.map$/, /asset-manifest\.json$/, /LICENSE/],
          // Bump up the default maximum size (2mb) that's precached,
          // to make lazy-loading failure scenarios less likely.
          // See https://github.com/cra-template/pwa/issues/13#issuecomment-722667270
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        }),
      // TypeScript type checking
      useTypeScript &&
        new ForkTsCheckerWebpackPlugin({
          async: isEnvDevelopment,
          typescript: {
            typescriptPath: resolve.sync('typescript', {
              basedir: paths.appNodeModules,
            }),
            configOverwrite: {
              compilerOptions: {
                sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                skipLibCheck: true,
                inlineSourceMap: false,
                declarationMap: false,
                noEmit: true,
                incremental: true,
                tsBuildInfoFile: paths.appTsBuildInfoFile,
              },
            },
            context: paths.appPath,
            diagnosticOptions: {
              syntactic: true,
            },
            mode: 'write-references',
            memoryLimit: projectConfig.MEMORY_LIMIT ?? 2048,
          },
          issue: {
            // This one is specifically to match during CI tests,
            // as micromatch doesn't match
            // '../cra-template-typescript/template/src/App.tsx'
            // otherwise.
            include: [{ file: '../**/src/**/*.{ts,tsx}' }, { file: '**/src/**/*.{ts,tsx}' }],
            exclude: [
              { file: '**/src/**/__tests__/**' },
              { file: '**/src/**/?(*.){spec|test}.*' },
              { file: '**/src/setupProxy.*' },
              { file: '**/src/setupTests.*' },
            ],
          },
          logger: 'webpack-infrastructure',
        }),
      !disableESLintPlugin &&
        new ESLintPlugin({
          // Plugin options
          extensions: ['js', 'mjs', 'jsx', 'ts', 'tsx'],
          formatter: require.resolve('react-dev-utils/eslintFormatter'),
          eslintPath: require.resolve('eslint'),
          failOnError: !(isEnvDevelopment && emitErrorsAsWarnings),
          context: paths.appSrc,
          cache: true,
          cacheLocation: path.resolve(paths.appNodeModules, '.cache/.eslintcache'),
          // ESLint class options
          cwd: paths.appPath,
          resolvePluginsRelativeTo: __dirname,
          baseConfig: {
            extends: [require.resolve('eslint-config-react-app/base')],
            rules: {
              ...(!hasJsxRuntime && {
                'react/react-in-jsx-scope': 'error',
              }),
            },
          },
        }),
    ].filter(Boolean),
    // Turn off performance processing because we utilize
    // our own hints via the FileSizeReporter
    performance: false,
    ignoreWarnings: [
      // Ignore warnings raised by source-map-loader.
      // some third party packages may ship miss-configured sourcemaps, that interrupts the build
      // See: https://github.com/facebook/create-react-app/discussions/11278#discussioncomment-1780169
      /**
       * @param {import('webpack').WebpackError} warning
       * @returns {boolean}
       */
      (warning) =>
        warning.module &&
        warning.module.resource.includes('node_modules') &&
        warning.details &&
        warning.details.includes('source-map-loader'),
    ],
  }
}
