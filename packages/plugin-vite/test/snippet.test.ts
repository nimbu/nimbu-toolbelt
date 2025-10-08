import { paths } from '@nimbu-cli/command'
import { expect } from 'chai'
import { mkdtemp, readFile } from 'fs-extra'
import os from 'node:os'
import path from 'node:path'

import { createSnippetData, writeSnippets } from '../src/utils/snippet'

function setThemeRoot(themeRoot: string) {
  process.env.NIMBU_DIRECTORY = themeRoot
  ;(paths as unknown as { NIMBU_DIRECTORY: string }).NIMBU_DIRECTORY = themeRoot
}

describe('snippet writer', () => {
  const originalEnv = process.env.NIMBU_DIRECTORY
  const originalThemeRoot = paths.NIMBU_DIRECTORY

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NIMBU_DIRECTORY
    } else {
      process.env.NIMBU_DIRECTORY = originalEnv
    }

    ;(paths as unknown as { NIMBU_DIRECTORY: string }).NIMBU_DIRECTORY = originalThemeRoot
  })

  it('writes the snippet under the theme root', async () => {
    const themeRoot = await mkdtemp(path.join(os.tmpdir(), 'plugin-vite-snippet-'))
    setThemeRoot(themeRoot)

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
    setThemeRoot(themeRoot)

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
