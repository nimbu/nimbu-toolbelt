import path from 'node:path'

import type { InlineConfig } from 'vite'

import { EntryPoint } from './types'

function sanitizeChunkName(filePath: string): string {
  const baseName = path.basename(filePath)
  return baseName.replace(path.extname(baseName), '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'app'
}

function normalizeInputMap(input: string | string[] | Record<string, string> | undefined, root: string) {
  if (typeof input === 'string' && input.length > 0) {
    return { app: path.resolve(root, input) }
  }

  if (Array.isArray(input) && input.length > 0) {
    return input.reduce<Record<string, string>>((memo, entry) => {
      const absolute = path.resolve(root, entry)
      memo[sanitizeChunkName(entry)] = absolute
      return memo
    }, {})
  }

  if (input && typeof input === 'object') {
    return Object.entries(input).reduce<Record<string, string>>((memo, [key, value]) => {
      memo[key] = path.resolve(root, value)
      return memo
    }, {})
  }

  return {}
}

export function resolveEntryPoints(
  root: string,
  config: InlineConfig,
  fallbackEntries: Record<string, string> = {},
): EntryPoint[] {
  const normalizedRoot = path.resolve(root)
  const input = config?.build?.rollupOptions?.input
  const normalizedInput = {
    ...fallbackEntries,
    ...normalizeInputMap(input, normalizedRoot),
  }

  const entries = Object.entries(normalizedInput)
    .map<EntryPoint>(([name, absolutePath]) => ({
      name,
      absolutePath,
      relativePath: path.relative(normalizedRoot, absolutePath).split(path.sep).join('/'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (entries.length > 0) {
    return entries
  }

  const defaultEntryPath = path.resolve(normalizedRoot, 'src/index.ts')

  return [
    {
      name: 'app',
      absolutePath: fallbackEntries.app ?? defaultEntryPath,
      relativePath: path.relative(normalizedRoot, fallbackEntries.app ?? defaultEntryPath).split(path.sep).join('/'),
    },
  ]
}
