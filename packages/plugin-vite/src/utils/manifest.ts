import type { InlineConfig } from 'vite'

import { pathExists, readJson } from 'fs-extra'
import path from 'node:path'

import { createSnippetData } from './snippet'
import { EntryPoint, SnippetData } from './types'

interface ViteManifestEntry {
  assets?: string[]
  css?: string[]
  file: string
  isEntry?: boolean
  name?: string
  src?: string
}

type ViteManifest = Record<string, ViteManifestEntry>

function normalizeManifestKey(key: string) {
  return key.split(path.sep).join('/')
}

function normalizeOutputPath(filePath: string) {
  return filePath.split(path.sep).join('/')
}

function normalizeOutputPaths(files?: string[]) {
  return (files ?? []).map((filePath) => normalizeOutputPath(filePath))
}

export async function buildSnippetDataFromManifest(
  manifestPath: string,
  entryPoints: EntryPoint[],
): Promise<SnippetData> {
  const manifest: ViteManifest = await readJson(manifestPath)

  const entryAliasBySrc = new Map<string, string>()
  for (const entry of entryPoints) {
    entryAliasBySrc.set(normalizeManifestKey(entry.relativePath), entry.name)
    entryAliasBySrc.set(normalizeManifestKey(entry.absolutePath), entry.name)
  }

  const js: Record<string, string> = {}
  const css: Record<string, string[]> = {}
  const chunks: Set<string> = new Set()
  const assets: Set<string> = new Set()

  for (const [key, value] of Object.entries(manifest)) {
    const normalizedFile = normalizeOutputPath(value.file)
    assets.add(normalizedFile)

    const assetFiles = normalizeOutputPaths(value.assets)
    for (const asset of assetFiles) {
      assets.add(asset)
    }

    const cssFiles = normalizeOutputPaths(value.css)
    for (const asset of cssFiles) {
      assets.add(asset)
    }

    if (!value.isEntry) continue

    const normalizedKey = normalizeManifestKey(value.src ?? key)
    const chunkName = entryAliasBySrc.get(normalizedKey) ?? value.name ?? path.basename(value.file, path.extname(value.file))

    chunks.add(chunkName)
    js[chunkName] = normalizedFile
    css[chunkName] = cssFiles
  }

  return createSnippetData({
    assets: Array.from(assets),
    buildTimestamp: new Date().toISOString(),
    chunks: Array.from(chunks),
    css,
    entries: Array.from(chunks),
    js,
  })
}

export async function resolveManifestPath(outDir: string, config: InlineConfig): Promise<string> {
  if (config.build?.manifest === false) {
    throw new Error('Vite manifest generation is disabled. Enable build.manifest to use the Vite plugin.')
  }

  const candidates = new Set<string>()

  if (typeof config.build?.manifest === 'string') {
    const manifestOption = config.build.manifest
    const candidate = path.isAbsolute(manifestOption)
      ? manifestOption
      : path.join(outDir, manifestOption)
    candidates.add(candidate)
  }

  candidates.add(path.join(outDir, 'manifest.json'))
  candidates.add(path.join(outDir, '.vite/manifest.json'))

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate
    }
  }

  throw new Error(`Unable to locate Vite manifest. Checked: ${Array.from(candidates).join(', ')}`)
}
