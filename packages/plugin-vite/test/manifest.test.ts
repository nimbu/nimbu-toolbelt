import { expect } from 'chai'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import type { EntryPoint } from '../src/utils/types'

const requireModule = createRequire(import.meta.url)
const { mkdtemp, writeJson } = requireModule('fs-extra') as typeof import('fs-extra')
const { buildSnippetDataFromManifest } = requireModule('../src/utils/manifest') as typeof import('../src/utils/manifest')

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
    expect(snippet.buildTimestamp).to.be.a('string')
  })
})
