import fs from 'fs-extra'
import path from 'node:path'

import { getThemeRoot } from './project'
import { SnippetData } from './types'

async function copyFileWithMap(source: string, destination: string) {
  await fs.ensureDir(path.dirname(destination))
  await fs.copyFile(source, destination)

  const sourceMap = `${source}.map`
  if (await fs.pathExists(sourceMap)) {
    await fs.ensureDir(path.dirname(`${destination}.map`))
    await fs.copyFile(sourceMap, `${destination}.map`)
  }
}

export async function syncBuildOutput(outDir: string, snippetData: SnippetData): Promise<void> {
  const themeRoot = getThemeRoot()

  const assets = new Set<string>()
  for (const file of Object.values(snippetData.js)) {
    assets.add(file)
  }

  for (const files of Object.values(snippetData.css)) {
    for (const file of files) assets.add(file)
  }

  for (const relative of assets) {
    const sourcePath = path.join(outDir, relative)
    const destinationPath = path.join(themeRoot, relative)

    if (await fs.pathExists(sourcePath)) {
      await copyFileWithMap(sourcePath, destinationPath)
    }
  }
}
