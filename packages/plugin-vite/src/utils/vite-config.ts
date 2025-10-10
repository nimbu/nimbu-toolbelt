import type { InlineConfig, UserConfig } from 'vite'

import { createRequire } from 'node:module'
import path from 'node:path'

import { getThemeRoot } from './project'

function assetFileNamesPattern(assetName = '') {
  const ext = path.extname(assetName)

  if (ext === '.css') {
    return 'stylesheets/[name][extname]'
  }

  if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(assetName)) {
    return 'images/[name][extname]'
  }

  if (/\.(woff2?|ttf|otf|eot)$/i.test(assetName)) {
    return 'fonts/[name][extname]'
  }

  if (/\.(mp4|mp3|webm|ogg)$/i.test(assetName)) {
    return 'media/[name][extname]'
  }

  return 'assets/[name][extname]'
}

function withStableFilenames(config: UserConfig): UserConfig {
  return {
    ...config,
    build: {
      ...config.build,
      rollupOptions: {
        ...config.build?.rollupOptions,
        output: {
          ...config.build?.rollupOptions?.output,
          assetFileNames: (assetInfo) => assetFileNamesPattern(assetInfo.name),
          chunkFileNames: 'javascripts/[name].js',
          entryFileNames: 'javascripts/[name].js',
        },
      },
    },
  }
}

function getResolver(root: string) {
  try {
    return createRequire(path.join(root, 'package.json'))
  } catch {}
}

function loadOptional(root: string, id: string) {
  const resolver = getResolver(root)
  if (!resolver) return

  try {
    const mod = resolver(id)
    return mod?.default ?? mod
  } catch {}
}

function resolveTailwindMajorVersion(root: string) {
  const resolver = getResolver(root)
  if (!resolver) return 0

  try {
    const pkgPath = resolver.resolve('tailwindcss/package.json')

    const pkg = resolver(pkgPath) as { version?: string }
    const major = Number.parseInt((pkg?.version ?? '0').split('.')[0] ?? '0', 10)
    return Number.isNaN(major) ? 0 : major
  } catch {
    return 0
  }
}

function resolvePostcssPlugins(root: string) {
  const plugins: any[] = []

  const tailwindMajor = resolveTailwindMajorVersion(root)
  if (tailwindMajor >= 4) {
    const tailwindPostCss = loadOptional(root, '@tailwindcss/postcss')
    if (tailwindPostCss) plugins.push(tailwindPostCss)
  } else if (tailwindMajor > 0) {
    const tailwindCss = loadOptional(root, 'tailwindcss')
    if (tailwindCss) plugins.push(tailwindCss)
  }

  const autoprefixer = loadOptional(root, 'autoprefixer')
  if (autoprefixer) {
    plugins.push(autoprefixer)
  }

  return plugins
}

function createCssConfig(root: string) {
  const plugins = resolvePostcssPlugins(root)
  if (plugins.length === 0) return

  return {
    postcss: {
      plugins,
    },
  }
}

function createDefaultConfig(root: string): InlineConfig {
  const tmplRoot = root
  const defaultEntry = path.join(tmplRoot, 'src/index.ts')
  const cssConfig = createCssConfig(root)

  const baseConfig: UserConfig = {
    build: {
      emptyOutDir: true,
      manifest: true,
      outDir: path.join(tmplRoot, '.nimbu-vite'),
      rollupOptions: {
        input: {
          app: defaultEntry,
        },
      },
    },
    cacheDir: path.join(tmplRoot, 'node_modules/.vite'),
    envDir: tmplRoot,
    publicDir: path.join(tmplRoot, 'public'),
    root: tmplRoot,
    server: {
      host: 'localhost',
      port: 5173,
    },
  }

  if (cssConfig) {
    baseConfig.css = cssConfig
  }

  return withStableFilenames(baseConfig)
}

export interface ResolvedViteConfig {
  config: InlineConfig
  configFile?: string
}

export async function resolveViteConfig(
  command: 'build' | 'serve',
  overrides: InlineConfig = {},
): Promise<ResolvedViteConfig> {
  const root = overrides.root ? path.resolve(overrides.root) : getThemeRoot()
  const mode = overrides.mode ?? (command === 'serve' ? 'development' : 'production')

  const { loadConfigFromFile, mergeConfig } = await import('vite')
  const userConfigResult = await loadConfigFromFile({ command, mode }, undefined, root)
  const defaultConfig = createDefaultConfig(root)

  const merged = mergeConfig(mergeConfig(defaultConfig, userConfigResult?.config ?? {}), {
    ...overrides,
    build: {
      manifest: true,
      ...overrides.build,
    },
    root,
  })

  // Ensure stable filenames remain in place after merging overrides
  const finalConfig = withStableFilenames(merged)

  return { config: finalConfig, configFile: userConfigResult?.path }
}
