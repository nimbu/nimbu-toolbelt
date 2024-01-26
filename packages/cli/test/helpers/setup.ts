/* eslint-disable import/no-named-as-default-member */
import { Interfaces } from '@oclif/core'
import base from '@oclif/test'
import { loadConfig } from '@oclif/test/lib/load-config'
import mockfs from 'mock-fs'
import nock from 'nock'

import { AbsPath, MockFSHelper } from './utils'

export { expect } from '@oclif/test'

export function nockActivate() {
  if (!nock.isActive()) {
    nock.activate()
  }

  nock.disableNetConnect()
}

export function nockCleanup() {
  nock.abortPendingRequests()
  nock.cleanAll()
  nock.restore()
}

const castArray = <T>(input?: T | T[]): T[] => {
  if (input === undefined) return []
  return Array.isArray(input) ? input : [input]
}

export const test = base
  .register('fs', (memfs: any) => ({
    finally() {
      mockfs.restore()
    },
    run(ctx: { fs: any }) {
      ctx.fs = () => {
        const helper = new MockFSHelper(memfs)
        helper.addFile(new AbsPath('./package.json'))

        helper.addDirContents(new AbsPath('./test/'))
        helper.addDirContents(new AbsPath('./src/'))
        helper.addDirContents(new AbsPath('./node_modules/typescript'))
        helper.addDirContents(new AbsPath('./node_modules/node-yaml'))
        helper.addDirContents(new AbsPath('./node_modules/@oclif'))

        mockfs(memfs)
      }
    },
  }))
  .register('command', (args: string | string[], opts: loadConfig.Options = {}) => ({
    async run(ctx: { config: Interfaces.Config; expectation: string; fs: any }) {
      if (!ctx.config || opts.reset) ctx.config = (await loadConfig(opts).run({} as any)) as any
      args = castArray(args)
      const [id, ...extra] = args
      ctx.expectation = ctx.expectation || `runs ${args.join(' ')}`
      // hook into memory fs here
      if (ctx.fs) ctx.fs()
      await ctx.config.runHook('init', { argv: extra, id })
      await ctx.config.runCommand(id, extra)
    },
  }))
  .register('disableNetConnect', () => ({
    finally() {
      nock.enableNetConnect()
    },
    run() {
      nock.disableNetConnect()
    },
  }))
  .disableNetConnect()

export default test
