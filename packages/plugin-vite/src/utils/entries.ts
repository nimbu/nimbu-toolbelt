import type { InlineConfig } from 'vite'

import path from 'node:path'

import { EntryPoint } from './types'

function sanitizeChunkName(filePath: string): string {
  const baseName = path.basename(filePath)
  return baseName.replace(path.extname(baseName), '').replaceAll(/[^\w-]/g, '_') || 'app'
}

function normalizeInputMap(input: Record<string, string> | string | string[] | undefined, root: string) {
  if (typeof input === 'string' && input.length > 0) {
    return { app: path.resolve(root, input) }
  }

  if (Array.isArray(input) && input.length > 0) {
    const resolvedEntries: Record<string, string> = {}

    for (const entry of input) {
      const absolute = path.resolve(root, entry)
      resolvedEntries[sanitizeChunkName(entry)] = absolute
    }

    return resolvedEntries
  }

  if (input && typeof input === 'object') {
    const resolvedEntries: Record<string, string> = {}

    for (const [key, value] of Object.entries(input)) {
      resolvedEntries[key] = path.resolve(root, value)
    }

    return resolvedEntries
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
      absolutePath,
      name,
      relativePath: path.relative(normalizedRoot, absolutePath).split(path.sep).join('/'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (entries.length > 0) {
    return entries
  }

  const defaultEntryPath = path.resolve(normalizedRoot, 'src/index.ts')

  return [
    {
      absolutePath: fallbackEntries.app ?? defaultEntryPath,
      name: 'app',
      relativePath: path
        .relative(normalizedRoot, fallbackEntries.app ?? defaultEntryPath)
        .split(path.sep)
        .join('/'),
    },
  ]
}
