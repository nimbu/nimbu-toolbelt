import fs from 'fs-extra'
import path from 'node:path'

import { createSnippetData } from './snippet'
import { EntryPoint, SnippetData } from './types'

interface ViteManifestEntry {
  file: string
  name?: string
  src?: string
  isEntry?: boolean
  css?: string[]
  assets?: string[]
}

type ViteManifest = Record<string, ViteManifestEntry>

function normalizeManifestKey(key: string) {
  return key.split(path.sep).join('/')
}

export async function buildSnippetDataFromManifest(
  manifestPath: string,
  entryPoints: EntryPoint[],
): Promise<SnippetData> {
  const manifest: ViteManifest = await fs.readJson(manifestPath)

  const entryAliasBySrc = new Map<string, string>()
  for (const entry of entryPoints) {
    entryAliasBySrc.set(normalizeManifestKey(entry.relativePath), entry.name)
    entryAliasBySrc.set(normalizeManifestKey(entry.absolutePath), entry.name)
  }

  const js: Record<string, string> = {}
  const css: Record<string, string[]> = {}
  const chunks: Set<string> = new Set()

  for (const [key, value] of Object.entries(manifest)) {
    if (!value.isEntry) continue

    const normalizedKey = normalizeManifestKey(value.src ?? key)
    const chunkName = entryAliasBySrc.get(normalizedKey) ?? value.name ?? path.basename(value.file, path.extname(value.file))

    chunks.add(chunkName)
    js[chunkName] = value.file
    css[chunkName] = (value.css ?? []).map((asset) => asset.split(path.sep).join('/'))
  }

  return createSnippetData({
    buildTimestamp: new Date().toISOString(),
    chunks: Array.from(chunks),
    entries: Array.from(chunks),
    js,
    css,
  })
}
