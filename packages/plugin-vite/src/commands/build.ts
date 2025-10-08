import type { InlineConfig } from 'vite'

import { Command, displayNimbuHeader } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import fs from 'node:fs'
import path from 'node:path'

import { runViteBuild } from '../build/builder'
import { resolveEntryPoints } from '../utils/entries'
import { resolveViteConfig } from '../utils/vite-config'

export default class Build extends Command {
  static description = 'build assets using Vite'

  static flags = {
    mode: Flags.string({
      description: 'Vite mode to use for the build',
      env: 'VITE_MODE',
    }),
    outdir: Flags.string({
      description: 'Override the Vite output directory',
    }),
  }

  async execute(): Promise<void> {
    displayNimbuHeader()

    const { flags } = await this.parse(Build)
    const root = process.cwd()

    const overrides: InlineConfig = {
      mode: flags.mode,
      root,
    }

    if (flags.outdir) {
      overrides.build = {
        ...overrides.build,
        outDir: flags.outdir,
      }
    }

    const { config } = await resolveViteConfig('build', overrides)

    const fallbackEntries = this.resolveFallbackEntries(root)
    const entryPoints = resolveEntryPoints(config.root ?? root, config, fallbackEntries)

    try {
      await runViteBuild({ config, entryPoints })
    } catch (error) {
      console.error(chalk.red('Vite build failed'))
      console.error(error)
      this.exit(1)
    }
  }

  private resolveFallbackEntries(root: string): Record<string, string> {
    const candidates = [
      this.buildConfig?.JS_ENTRY,
      'index.tsx',
      'index.ts',
      'index.jsx',
      'index.js',
      'main.tsx',
      'main.ts',
      'main.jsx',
      'main.js',
    ].filter(Boolean)

    for (const candidate of candidates) {
      const filePath = path.join(root, 'src', candidate)
      if (fs.existsSync(filePath)) {
        return { app: filePath }
      }
    }

    return { app: path.join(root, 'src', 'index.ts') }
  }
}
