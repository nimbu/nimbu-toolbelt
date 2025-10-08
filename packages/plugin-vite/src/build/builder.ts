import type { InlineConfig } from 'vite'

import chalk from 'chalk'
import path from 'node:path'

import { buildSnippetDataFromManifest, resolveManifestPath } from '../utils/manifest'
import { syncBuildOutput } from '../utils/output'
import { writeSnippets } from '../utils/snippet'
import { EntryPoint } from '../utils/types'

export interface ViteBuildOptions {
  config: InlineConfig
  entryPoints: EntryPoint[]
}

export async function runViteBuild(options: ViteBuildOptions): Promise<void> {
  const { config, entryPoints } = options
  const root = config.root ? path.resolve(config.root) : process.cwd()
  const outDir = path.resolve(root, config.build?.outDir ?? 'dist')

  console.log(chalk.cyan('Building assets with Vite...'))
  const { build } = await import('vite')
  await build(config)

  const manifestPath = await resolveManifestPath(outDir, config)
  const snippetData = await buildSnippetDataFromManifest(manifestPath, entryPoints)

  await syncBuildOutput(outDir, snippetData)
  const snippets = await writeSnippets(snippetData)

  console.log(chalk.green('Build complete'))
  console.log(chalk.green(`✳ Snippet updated at ${snippets.aggregate}`))
}
