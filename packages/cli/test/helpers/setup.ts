/* eslint-disable import/no-named-as-default-member */
import { Config, Errors, Interfaces } from '@oclif/core'
import { expect } from 'chai'
import { fancy } from 'fancy-test'
import { resolve as resolvePath } from 'node:path'
import mockfs from 'mock-fs'
import nock from 'nock'

import { AbsPath, MockFSHelper } from './utils'

export { expect }

const cliRoot = resolvePath(__dirname, '../..')

type CommandOptions = Partial<Interfaces.Options> & { reset?: boolean }

type TestContext = {
  commandError?: unknown
  config?: Interfaces.Config
  expectExit?: boolean
  expectedExitCode?: number
  expectation?: string
  fs?: () => void
}

const castArray = <T>(input?: T | T[]): T[] => {
  if (input === undefined) return []
  return Array.isArray(input) ? input : [input]
}

const loadCliConfig = async (opts: Partial<Interfaces.Options> = {}) => {
  const { root, ...rest } = opts
  const restOpts = rest as Omit<Interfaces.Options, 'root'>
  const options: Interfaces.Options = { root: root ?? cliRoot, ...restOpts }
  return Config.load(options)
}

const base = (fancy as any)
  .register('fs', (memfs: any) => ({
    finally() {
      mockfs.restore()
    },
    run(ctx) {
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
  .register('command', (args: string | string[], opts: CommandOptions = {}) => ({
    async run(ctx) {
      const argv = castArray(args)
      const { reset, ...loadOpts } = opts
      if (!ctx.config || reset) {
        ctx.config = await loadCliConfig(loadOpts)
      }

      ctx.expectation = ctx.expectation ?? `runs ${argv.join(' ')}`
      const [id, ...extra] = argv

      if (ctx.fs) ctx.fs()

      try {
        await ctx.config!.runHook('init', { argv: extra, id })
        await ctx.config!.runCommand(id, extra)
        ctx.commandError = undefined
      } catch (error) {
        ctx.commandError = error
        const exitError = error as any
        const isExit = exitError instanceof Errors.ExitError || exitError?.oclif?.exit != null

        if (!(ctx.expectExit && isExit)) {
          throw error
        }
      }
    },
    finally(ctx) {
      if (ctx.expectExit) {
        const exitError = ctx.commandError as any
        const actualExit = exitError?.oclif?.exit ?? process.exitCode ?? 0

        if (!exitError || (exitError instanceof Errors.ExitError === false && exitError?.oclif?.exit == null)) {
          throw new Error(
            `Expected command to exit with code ${ctx.expectedExitCode ?? 'unknown'}, but it completed successfully.`,
          )
        }

        if (ctx.expectedExitCode != null && actualExit !== ctx.expectedExitCode) {
          throw new Error(`Expected exit code ${ctx.expectedExitCode}, but received ${actualExit ?? 'unknown'}.`)
        }
      } else if (ctx.commandError) {
        throw ctx.commandError
      }
    },
  }))
  .register('exit', (code: number) => ({
    init(ctx) {
      ctx.expectExit = true
      ctx.expectedExitCode = code
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

export const test = base

export default test
