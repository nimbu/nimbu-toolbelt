import { expect } from 'chai'
import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'

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
    const themeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-vite-snippet-'))
    process.env.NIMBU_DIRECTORY = themeRoot

    const { createSnippetData, writeSnippets } = await import('../src/utils/snippet')

    const snippetData = createSnippetData({
      chunks: ['app'],
      entries: ['app'],
      js: { app: 'javascripts/app.js' },
      css: { app: ['stylesheets/app.css'] },
    })

    const { aggregate, entries } = await writeSnippets(snippetData)
    const content = await fs.readFile(aggregate, 'utf8')
    const entryContent = await fs.readFile(entries[0], 'utf8')

    expect(aggregate).to.equal(path.join(themeRoot, 'snippets', 'vite.liquid'))
    expect(entries[0]).to.equal(path.join(themeRoot, 'snippets', 'vite_app.liquid'))
    expect(content).to.contain('vite_js')
    expect(content).to.contain('javascripts/app.js')
    expect(entryContent).to.contain('app_vite_js')
  })

  it('sanitises entry names for filenames and variables', async () => {
    const themeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-vite-snippet-'))
    process.env.NIMBU_DIRECTORY = themeRoot

    const { createSnippetData, writeSnippets } = await import('../src/utils/snippet')

    const snippetData = createSnippetData({
      chunks: ['My-Entry'],
      entries: ['My-Entry'],
      js: { 'My-Entry': 'javascripts/my-entry.js' },
      css: { 'My-Entry': [] },
    })

    const { entries } = await writeSnippets(snippetData)
    expect(entries[0]).to.equal(path.join(themeRoot, 'snippets', 'vite_my_entry.liquid'))

    const content = await fs.readFile(entries[0], 'utf8')
    expect(content).to.contain('my_entry_vite_js')
  })
})
