import * as Config from '@oclif/config'

import base, { expect } from '@oclif/test'
import { loadConfig } from '@oclif/test/lib/load-config'
import nock from 'nock'
import mockfs from 'mock-fs'

import { AbsPath, MockFSHelper } from './utils'

const castArray = <T>(input?: T | T[]): T[] => {
  if (input === undefined) return []
  return Array.isArray(input) ? input : [input]
}

let test = base
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
      async run(ctx: { fs: any; config: Config.IConfig; expectation: string }) {
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

test = test.disableNetConnect()

export { test as default, expect }
