import { ensureDir, writeFile } from 'fs-extra'
import path from 'node:path'

import { resolveSnippetPath } from './project'
import { SnippetData } from './types'

const AGGREGATE_HEADER = '{% assign vite_build_timestamp = "%BUILD_TIMESTAMP%" %}'

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

export interface WrittenSnippets {
  aggregate: string
}

export async function writeSnippets(data: SnippetData): Promise<WrittenSnippets> {
  const aggregatePath = resolveSnippetPath('vite.liquid')
  await ensureDir(path.dirname(aggregatePath))
  await writeFile(aggregatePath, renderAggregateSnippet(data), 'utf8')

  return { aggregate: aggregatePath }
}

export function createSnippetData(partial: Partial<SnippetData>): SnippetData {
  const chunks = partial.chunks ? [...partial.chunks] : []
  return {
    assets: partial.assets ? [...partial.assets] : [],
    buildTimestamp: partial.buildTimestamp ?? new Date().toISOString(),
    chunks,
    css: partial.css ?? {},
    entries: partial.entries ? [...partial.entries] : chunks,
    js: partial.js ?? {},
  }
}
