import type { InlineConfig } from 'vite'

import { expect } from 'chai'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import type { EntryPoint } from '../src/utils/types'

const requireModule = createRequire(import.meta.url)
const { ensureDir, mkdtemp, writeJson } = requireModule('fs-extra') as typeof import('fs-extra')
const { buildSnippetDataFromManifest, resolveManifestPath } = requireModule('../src/utils/manifest') as typeof import('../src/utils/manifest')

describe('buildSnippetDataFromManifest', () => {
  it('returns chunk mappings based on manifest entries', async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'plugin-vite-manifest-'))
    const manifestPath = path.join(tmpDir, 'manifest.json')

    const manifest = {
      'src/main.ts': {
        css: ['stylesheets/app.css'],
        file: 'javascripts/app.js',
        isEntry: true,
      },
    }

    await writeJson(manifestPath, manifest)

    const entryPoints: EntryPoint[] = [
      {
        absolutePath: path.join(tmpDir, '..', 'src', 'main.ts'),
        name: 'app',
        relativePath: 'src/main.ts',
      },
    ]

    const snippet = await buildSnippetDataFromManifest(manifestPath, entryPoints)

    expect(snippet.chunks).to.deep.equal(['app'])
    expect(snippet.js.app).to.equal('javascripts/app.js')
    expect(snippet.css.app).to.deep.equal(['stylesheets/app.css'])
    expect(snippet.assets).to.include('javascripts/app.js')
    expect(snippet.assets).to.include('stylesheets/app.css')
    expect(snippet.buildTimestamp).to.be.a('string')
  })

  it('includes asset files and dynamic chunks for syncing', async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'plugin-vite-manifest-'))
    const manifestPath = path.join(tmpDir, 'manifest.json')

    const manifest = {
      'chunk-async.js': {
        file: 'javascripts/chunk-async.js',
        isEntry: false,
      },
      'src/main.ts': {
        assets: ['images/logo.png'],
        css: ['stylesheets/app.css'],
        file: 'javascripts/app.js',
        imports: ['chunk-async.js'],
        isEntry: true,
      },
    }

    await writeJson(manifestPath, manifest)

    const entryPoints: EntryPoint[] = [
      {
        absolutePath: path.join(tmpDir, '..', 'src', 'main.ts'),
        name: 'app',
        relativePath: 'src/main.ts',
      },
    ]

    const snippet = await buildSnippetDataFromManifest(manifestPath, entryPoints)

    expect(snippet.assets).to.include.members([
      'javascripts/app.js',
      'javascripts/chunk-async.js',
      'stylesheets/app.css',
      'images/logo.png',
    ])
  })
})

describe('resolveManifestPath', () => {
  it('prefers manifest files inside the .vite directory when present', async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'plugin-vite-manifest-'))
    const outDir = path.join(tmpDir, '.nimbu-vite')
    const manifestPath = path.join(outDir, '.vite', 'manifest.json')

    await ensureDir(path.dirname(manifestPath))
    await writeJson(manifestPath, {})

    const config: InlineConfig = {
      build: {
        manifest: true,
      },
    }

    const resolved = await resolveManifestPath(outDir, config)

    expect(resolved).to.equal(manifestPath)
  })

  it('resolves custom manifest filenames relative to outDir', async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'plugin-vite-manifest-'))
    const outDir = path.join(tmpDir, '.nimbu-vite')
    const manifestPath = path.join(outDir, 'custom', 'manifest.json')

    await ensureDir(path.dirname(manifestPath))
    await writeJson(manifestPath, {})

    const config: InlineConfig = {
      build: {
        manifest: 'custom/manifest.json',
      },
    }

    const resolved = await resolveManifestPath(outDir, config)

    expect(resolved).to.equal(manifestPath)
  })
})
