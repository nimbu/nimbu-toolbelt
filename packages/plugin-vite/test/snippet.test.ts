import { expect } from 'chai'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

const requireModule = createRequire(import.meta.url)

const { mkdtemp, readFile } = requireModule('fs-extra') as typeof import('fs-extra')

type SnippetModule = typeof import('../src/utils/snippet')

async function loadSnippetModule(): Promise<SnippetModule> {
  const modulesToReset = [
    '../src/utils/snippet',
    '../src/utils/project',
    '@nimbu-cli/command',
    '@nimbu-cli/command/lib/config/paths',
  ]

  for (const specifier of modulesToReset) {
    try {
      const resolved = requireModule.resolve(specifier)
      delete requireModule.cache[resolved]
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
        throw error
      }
    }
  }

  return requireModule('../src/utils/snippet') as SnippetModule
}

describe('snippet writer', () => {
  const originalEnv = process.env.NIMBU_DIRECTORY

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NIMBU_DIRECTORY
    } else {
      process.env.NIMBU_DIRECTORY = originalEnv
    }
  })

  it('writes the snippet under the theme root', async () => {
    const themeRoot = await mkdtemp(path.join(os.tmpdir(), 'plugin-vite-snippet-'))
    process.env.NIMBU_DIRECTORY = themeRoot

    const { createSnippetData, writeSnippets } = await loadSnippetModule()

    const snippetData = createSnippetData({
      chunks: ['app'],
      css: { app: ['stylesheets/app.css'] },
      entries: ['app'],
      js: { app: 'javascripts/app.js' },
    })

    const { aggregate } = await writeSnippets(snippetData)
    const content = await readFile(aggregate, 'utf8')

    expect(aggregate).to.equal(path.join(themeRoot, 'snippets', 'vite.liquid'))
    expect(content).to.contain('vite_js')
    expect(content).to.contain('javascripts/app.js')
  })

  it('sanitises entry names for filenames and variables', async () => {
    const themeRoot = await mkdtemp(path.join(os.tmpdir(), 'plugin-vite-snippet-'))
    process.env.NIMBU_DIRECTORY = themeRoot

    const { createSnippetData, writeSnippets } = await loadSnippetModule()

    const snippetData = createSnippetData({
      chunks: ['My-Entry'],
      css: { 'My-Entry': [] },
      entries: ['My-Entry'],
      js: { 'My-Entry': 'javascripts/my-entry.js' },
    })

    const { aggregate } = await writeSnippets(snippetData)
    const content = await readFile(aggregate, 'utf8')
    expect(content).to.contain('My-Entry')
    expect(content).to.contain('my-entry.js')
  })
})
