import { expect } from 'chai'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'

import { buildSnippetDataFromManifest } from '../src/utils/manifest'
import { EntryPoint } from '../src/utils/types'

describe('buildSnippetDataFromManifest', () => {
  it('returns chunk mappings based on manifest entries', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-vite-manifest-'))
    const manifestPath = path.join(tmpDir, 'manifest.json')

    const manifest = {
      'src/main.ts': {
        file: 'javascripts/app.js',
        isEntry: true,
        css: ['stylesheets/app.css'],
      },
    }

    await fs.writeJson(manifestPath, manifest)

    const entryPoints: EntryPoint[] = [
      {
        name: 'app',
        absolutePath: path.join(tmpDir, '..', 'src', 'main.ts'),
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
