import { buildConfig } from '@nimbu-cli/command'
import fs from 'node:fs'
import path from 'node:path'

import { nimbuAssetsPlugin } from '../plugins/nimbu-assets'
import { createNimbuPaths } from './paths'

export interface ViteConfigOptions {
  /**
   * Environment: 'development' | 'production'
   */
  mode?: string

  /**
   * Base URL for assets
   */
  base?: string

  /**
   * Development server options
   */
  server?: {
    host?: string | boolean
    port?: number
    cors?: boolean | any
    hmr?: boolean | any
    middlewareMode?: boolean
    fs?: {
      strict?: boolean
      allow?: string[]
    }
    origin?: string
    proxy?: Record<string, string | any>
    sourcemapIgnoreList?: (sourcePath: string, sourcemapPath: string) => boolean
  }

  /**
   * Plugins array - matches official Vite interface
   */
  plugins?: any[]

  /**
   * Define global constants
   */
  define?: Record<string, any>

  /**
   * Module resolution options
   */
  resolve?: {
    alias?: Record<string, string> | Array<{ find: string | RegExp; replacement: string }>
    dedupe?: string[]
    conditions?: string[]
    mainFields?: string[]
    extensions?: string[]
  }

  /**
   * Root directory (where index.html is located)
   */
  root?: string

  /**
   * Public directory for static assets
   */
  publicDir?: string | false

  /**
   * Cache directory
   */
  cacheDir?: string

  /**
   * Environment directory
   */
  envDir?: string | false

  /**
   * Environment prefix
   */
  envPrefix?: string | string[]

  /**
   * Log level
   */
  logLevel?: 'info' | 'warn' | 'error' | 'silent'

  /**
   * Application type
   */
  appType?: 'spa' | 'mpa' | 'custom'

  /**
   * ESBuild options
   */
  esbuild?: any | false

  /**
   * CSS preprocessor options
   */
  css?: {
    /**
     * PostCSS options
     */
    postcss?: any

    /**
     * SCSS options
     */
    preprocessorOptions?: {
      scss?: any
      less?: any
      styl?: any
    }

    /**
     * CSS modules options
     */
    modules?: any

    /**
     * Source maps in development
     */
    devSourcemap?: boolean
  }

  /**
   * Build options
   */
  build?: {
    /**
     * Output directory
     */
    outDir?: string

    /**
     * Generate source maps
     */
    sourcemap?: boolean | 'inline' | 'hidden'

    /**
     * CSS code splitting
     */
    cssCodeSplit?: boolean

    /**
     * Rollup options
     */
    rollupOptions?: any

    /**
     * Minification options
     */
    minify?: boolean | 'terser' | 'esbuild'

    /**
     * Assets inline limit
     */
    assetsInlineLimit?: number | ((filePath: string, content: Buffer) => boolean | undefined)

    /**
     * SSR build
     */
    ssr?: boolean | string

    /**
     * Library build
     */
    lib?: any

    /**
     * Module preload options
     */
    modulePreload?: any

    /**
     * Terser options
     */
    terserOptions?: any

    /**
     * CommonJS options
     */
    commonjsOptions?: any

    /**
     * Dynamic import vars options
     */
    dynamicImportVarsOptions?: any

    /**
     * Empty output directory before build
     */
    emptyOutDir?: boolean

    /**
     * Report compressed size
     */
    reportCompressedSize?: boolean

    /**
     * Chunk size warning limit
     */
    chunkSizeWarningLimit?: number
  }

  /**
   * Dependency optimization options
   */
  optimizeDeps?: {
    include?: string[]
    exclude?: string[]
    esbuildOptions?: any
    needsInterop?: string[]
  }

  /**
   * Future configuration options
   */
  future?: Record<string, 'warn' | undefined>

  /**
   * Nimbu-specific options
   */
  nimbu?: {
    /**
     * Enable Nimbu asset manifest generation
     */
    assets?: boolean

    /**
     * Template path for liquid generation
     */
    templatePath?: string

    /**
     * Output path for generated liquid snippet
     */
    outputPath?: string

    /**
     * Variable prefix for liquid variables
     */
    prefix?: string
  }
}

/**
 * Get project configuration for entry points and other settings
 */
function getProjectConfig() {
  try {
    // Try to get existing config first (might already be initialized)
    let config = buildConfig.get()

    // If no config, try to load directly from nimbu.js file
    if (!config || Object.keys(config).length === 0) {
      const projectDir = process.cwd()
      const nimbuConfigPath = path.join(projectDir, 'nimbu.js')

      if (fs.existsSync(nimbuConfigPath)) N{
        // Clear require cache to get fresh config
        delete require.cache[require.resolve(nimbuConfigPath)]
        config = require(nimbuConfigPath)
      }
    }

    return config || {}
  } catch (error) {
    console.warn('Warning: Could not load project configuration (nimbu.js)', error)
    return {}
  }
}

/**
 * Create base Vite configuration for Nimbu projects
 */
export function createViteConfig(options: ViteConfigOptions = {}) {
  const { mode = 'development', base = '/', server = {}, nimbu = {}, css = {}, build = {} } = options

  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'
  const paths = createNimbuPaths()
  const projectConfig = getProjectConfig()

  // Get entry points from project config or use defaults
  const defaultEntry = {
    app: paths.appSrc + '/index.js',
  }

  // Support multiple configuration formats:
  // 1. Modern: WEBPACK_ENTRY/VITE_ENTRY object
  // 2. Direct: entry keys at root level (fallback)
  let entry = (projectConfig as any).WEBPACK_ENTRY || (projectConfig as any).VITE_ENTRY

  // If no nested entry config, look for direct entry properties
  if (!entry && projectConfig && typeof projectConfig === 'object') {
    const potentialEntries: Record<string, any> = {}
    for (const [key, value] of Object.entries(projectConfig)) {
      // Skip known config properties
      if (!['REACT', 'CDN_ROOT', 'GENERATE_SOURCEMAP'].includes(key)) {
        potentialEntries[key] = value
      }
    }
    if (Object.keys(potentialEntries).length > 0) {
      entry = potentialEntries
    }
  }

  // Final fallback to default
  entry = entry || defaultEntry

  // Convert webpack-style array entries to Vite-compatible format
  // Webpack allows: { app: ['./src/index.ts', './src/index.css'] }
  // Vite expects: { app: './src/index.ts', app_styles: './src/index.css' } OR import CSS in JS
  if (entry && typeof entry === 'object') {
    const convertedEntry: Record<string, string> = {}
    for (const [key, value] of Object.entries(entry)) {
      if (Array.isArray(value)) {
        const files = value as string[]

        // Separate JS/TS files from CSS files
        const jsFiles = files.filter(file => /\.(js|ts|jsx|tsx)$/.test(file))
        const cssFiles = files.filter(file => /\.(css|scss|sass|less|styl)$/.test(file))

        // Add the primary JS entry
        if (jsFiles.length > 0) {
          convertedEntry[key] = jsFiles[0]
        } else if (files.length > 0) {
          convertedEntry[key] = files[0]
        }

        // Add CSS files as separate entries (optional - for advanced use cases)
        cssFiles.forEach((cssFile, index) => {
          const cssKey = index === 0 ? `${key}_styles` : `${key}_styles_${index}`
          convertedEntry[cssKey] = cssFile
        })

        // Log a helpful migration message
        if (cssFiles.length > 0 && isDevelopment) {
          console.warn(`⚠️  Migration Notice: CSS files found in entry '${key}'.`)
          console.warn(`   For best results, import CSS in your JS file:`)
          cssFiles.forEach(cssFile => {
            console.warn(`   import '${cssFile.replace('./src/', './')}'`)
          })
        }
      } else {
        convertedEntry[key] = value as string
      }
    }
    entry = convertedEntry
  }

  // Debug logging
  if (isDevelopment) {
    console.log('🔧 Vite Config Debug:')
    console.log('   Project config:', projectConfig)
    console.log('   Original entry:', (projectConfig as any).WEBPACK_ENTRY || (projectConfig as any).VITE_ENTRY)
    console.log('   Converted entry:', entry)
    console.log('   Paths:', { appSrc: paths.appSrc, appBuild: paths.appBuild })
  }

  const config = {
    mode,
    base,

    // Define environment variables
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode),
      DEBUG: isDevelopment ? 'true' : 'false',
    },

    // Resolve configuration
    resolve: {
      alias: {
        '@': paths.appSrc,
        '~': paths.appSrc,
      },
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.scss', '.css'],
    },

    // CSS configuration
    css: {
      // Source maps in development
      devSourcemap: isDevelopment,

      // PostCSS configuration
      postcss: {
        plugins: [require('autoprefixer'), require('postcss-nesting')],
        ...css.postcss,
      },

      // SCSS configuration
      preprocessorOptions: {
        scss: {
          includePaths: [paths.appSrc, 'node_modules'],
          ...css.preprocessorOptions?.scss,
        },
      },
    },

    // Build configuration
    build: {
      outDir: paths.appBuild,
      sourcemap: isProduction ? false : ('inline' as const),
      cssCodeSplit: false, // Keep CSS in one file for Liquid template integration

      // Rollup options for proper asset handling
      rollupOptions: {
        input: entry,
        output: {
          // Asset file naming to match nimbu expectations
          entryFileNames: 'javascripts/[name].js',
          chunkFileNames: 'javascripts/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name || ''
            const extType = info.split('.').pop()

            if (/\.(css|scss)$/.test(info)) {
              return 'stylesheets/[name][extname]'
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(info)) {
              return 'images/[name]-[hash][extname]'
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(info)) {
              return 'fonts/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },
        },

        // Optimize dependencies
        external: (id) => {
          // Don't bundle node_modules in the main bundle if they're large
          return /^(lodash|moment|jquery)$/.test(id)
        },
      },

      ...build,
    },

    // Development server configuration
    server: {
      host: server.host || 'localhost',
      port: server.port || 4567,
      cors: server.cors !== false,

      // Enable HMR
      hmr: {
        overlay: false,
      },
    },

    // Plugins
    plugins: [
      // Nimbu assets plugin for manifest generation
      nimbu.assets !== false &&
        nimbuAssetsPlugin({
          templatePath: nimbu.templatePath,
          outputPath: nimbu.outputPath || 'snippets/vite.liquid',
          prefix: nimbu.prefix || 'vite_',
        }),
    ].filter(Boolean),

    // Optimizations
    optimizeDeps: {
      include: [
        // Pre-bundle common dependencies
        'tslib',
      ],
      exclude: [
        // Don't pre-bundle these
      ],
    },

    // Enable strict mode for better error handling
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' as const },
    },
  }

  return config
}
