import { ensureDir, writeFile } from 'fs-extra'
import path from 'node:path'

import { resolveSnippetPath } from './project'
import { SnippetData } from './types'

const AGGREGATE_HEADER = '{% assign vite_build_timestamp = "%BUILD_TIMESTAMP%" %}'

function sanitizeEntryName(entry: string): string {
  const normalized = entry.toLowerCase().replaceAll(/[^\d_a-z]+/g, '_')
  return normalized.length > 0 ? normalized : 'entry'
}

function renderAggregateSnippet(data: SnippetData): string {
  const chunks = [...new Set(data.chunks.length > 0 ? data.chunks : Object.keys(data.js))]
  const sortedChunks = chunks.sort()

  const buildTimestamp = data.buildTimestamp || new Date().toISOString()
  const jsMap: Record<string, string> = {}
  const cssMap: Record<string, string[]> = {}

  for (const chunk of sortedChunks) {
    jsMap[chunk] = data.js[chunk] ?? ''
    cssMap[chunk] = data.css[chunk] ?? []
  }

  const lines = [
    AGGREGATE_HEADER.replace('%BUILD_TIMESTAMP%', buildTimestamp),
    `{% assign vite_chunks = '${JSON.stringify(sortedChunks)}' | from_json %}`,
    `{% assign vite_js = '${JSON.stringify(jsMap)}' | from_json %}`,
    `{% assign vite_css = '${JSON.stringify(cssMap)}' | from_json %}`,
    '',
  ]

  return lines.join('\n')
}

function renderEntrySnippet(data: SnippetData, entry: string): string {
  const buildTimestamp = data.buildTimestamp || new Date().toISOString()
  const normalizedEntry = sanitizeEntryName(entry)
  const jsAsset = data.js[entry] ?? ''
  const cssAssets = data.css[entry] ?? []

  const lines = [
    `{% assign ${normalizedEntry}_vite_build_timestamp = "${buildTimestamp}" %}`,
    `{% assign ${normalizedEntry}_vite_js = '${JSON.stringify(jsAsset)}' | from_json %}`,
    `{% assign ${normalizedEntry}_vite_css = '${JSON.stringify(cssAssets)}' | from_json %}`,
    '',
  ]

  return lines.join('\n')
}

export interface WrittenSnippets {
  aggregate: string
  entries: string[]
}

export async function writeSnippets(data: SnippetData): Promise<WrittenSnippets> {
  const aggregatePath = resolveSnippetPath('vite.liquid')
  await ensureDir(path.dirname(aggregatePath))
  await writeFile(aggregatePath, renderAggregateSnippet(data), 'utf8')

  const entryNames = ((data.entries?.length ? data.entries : data.chunks) ?? [])
    .filter((entry) => entry !== 'vite_client')
    .sort()
  const entryPaths: string[] = []
  const writtenEntries = new Set<string>()

  for (const entry of entryNames) {
    const sanitized = sanitizeEntryName(entry)
    if (writtenEntries.has(sanitized)) continue
    writtenEntries.add(sanitized)
    const entryPath = resolveSnippetPath(`vite_${sanitized}.liquid`)
    await writeFile(entryPath, renderEntrySnippet(data, entry), 'utf8')
    entryPaths.push(entryPath)
  }

  return { aggregate: aggregatePath, entries: entryPaths }
}

export function createSnippetData(partial: Partial<SnippetData>): SnippetData {
  const chunks = partial.chunks ? [...partial.chunks] : []
  const entries = partial.entries ? [...partial.entries] : chunks
  return {
    buildTimestamp: partial.buildTimestamp ?? new Date().toISOString(),
    chunks,
    css: partial.css ?? {},
    entries,
    js: partial.js ?? {},
  }
}
