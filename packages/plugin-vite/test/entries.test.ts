import { expect } from 'chai'
import path from 'node:path'

import { resolveEntryPoints } from '../src/utils/entries'

describe('resolveEntryPoints', () => {
  it('falls back to provided entries when config input is missing', () => {
    const root = '/project/theme'
    const fallback = {
      app: path.join(root, 'src', 'main.ts'),
    }

    const entryPoints = resolveEntryPoints(root, { build: { rollupOptions: {} } }, fallback)

    expect(entryPoints).to.have.lengthOf(1)
    expect(entryPoints[0].name).to.equal('app')
    expect(entryPoints[0].relativePath).to.equal('src/main.ts')
  })

  it('honours explicit rollup input maps', () => {
    const root = '/project/theme'
    const config = {
      build: {
        rollupOptions: {
          input: {
            editor: path.join(root, 'src/editor.ts'),
          },
        },
      },
    }

    const entryPoints = resolveEntryPoints(root, config)

    expect(entryPoints).to.have.lengthOf(1)
    expect(entryPoints[0].name).to.equal('editor')
    expect(entryPoints[0].relativePath).to.equal('src/editor.ts')
  })
})
