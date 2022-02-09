import { Interfaces } from '@oclif/core'
import Debug from 'debug'
import base, { expect } from '@oclif/test'
import { loadConfig } from '@oclif/test/lib/load-config'
import nock from 'nock'
import mockfs from 'mock-fs'

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
  .register('fs', (memfs: any) => {
    return {
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
      finally() {
        mockfs.restore()
      },
    }
  })
  .register('command', (args: string[] | string, opts: loadConfig.Options = {}) => {
    return {
      async run(ctx: { fs: any; config: Interfaces.Config; expectation: string }) {
        if (!ctx.config || opts.reset) ctx.config = await loadConfig(opts).run({} as any)
        args = castArray(args)
        let [id, ...extra] = args
        ctx.expectation = ctx.expectation || `runs ${args.join(' ')}`
        // hook into memory fs here
        if (ctx.fs) ctx.fs()
        await ctx.config.runHook('init', { id, argv: extra })
        await ctx.config.runCommand(id, extra)
      },
    }
  })
  .register('disableNetConnect', () => {
    return {
      run() {
        nock.disableNetConnect()
      },
      finally() {
        nock.enableNetConnect()
      },
    }
  })
  .disableNetConnect()

export default test
