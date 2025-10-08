/* eslint-disable import/no-named-as-default-member */
import { Config, Errors, Interfaces } from '@oclif/core'
import { expect } from 'chai'
import { fancy } from 'fancy-test'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve as resolvePath } from 'node:path'
import mockfs from 'mock-fs'
import nock from 'nock'

import { AbsPath, MockFSHelper } from './utils'

export { expect }

const cliRoot = resolvePath(__dirname, '../..')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Netrc: any = require('netrc-parser')

type SandboxEnvironment = {
  home: string
  netrcPath: string
  restoreEnv: () => void
  restoreNetrc: () => void
  cleanup: () => void
}

const createSandboxEnvironment = (): SandboxEnvironment => {
  const homePrefix = resolvePath(tmpdir(), 'nimbu-cli-test-')
  const sandboxHome = mkdtempSync(homePrefix)

  const sandboxConfigDir = resolvePath(sandboxHome, '.config')
  const sandboxCacheDir = resolvePath(sandboxHome, '.cache')
  const sandboxDataDir = resolvePath(sandboxHome, '.local', 'share')
  const sandboxNimbuDir = resolvePath(sandboxHome, '.nimbu')
  const netrcPath = resolvePath(sandboxHome, '.netrc')

  for (const dir of [sandboxHome, sandboxConfigDir, sandboxCacheDir, sandboxDataDir, sandboxNimbuDir]) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(netrcPath, '', { mode: 0o600 })

  const previousEnv: Record<string, string | undefined> = {
    HOME: process.env.HOME,
    USERPROFILE: process.env.USERPROFILE,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    XDG_DATA_HOME: process.env.XDG_DATA_HOME,
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
    HOMEDRIVE: process.env.HOMEDRIVE,
    HOMEPATH: process.env.HOMEPATH,
  }

  const originalNetrcFile = Netrc.file

  process.env.HOME = sandboxHome
  process.env.USERPROFILE = sandboxHome
  process.env.XDG_CONFIG_HOME = sandboxConfigDir
  process.env.XDG_DATA_HOME = sandboxDataDir
  process.env.XDG_CACHE_HOME = sandboxCacheDir
  delete process.env.HOMEDRIVE
  delete process.env.HOMEPATH

  Netrc.file = netrcPath
  try {
    Netrc.loadSync()
  } catch {
    Netrc.machines = {} as any
  }

  const restoreEnv = () => {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }

  const restoreNetrc = () => {
    Netrc.file = originalNetrcFile
    try {
      Netrc.loadSync()
    } catch {
      // ignore failures when running inside mock-fs; the next real read will reload
    }
  }

  const cleanup = () => {
    try {
      rmSync(sandboxHome, { recursive: true, force: true })
    } catch {
      // ignore removal failures in CI/Windows environments
    }
  }

  return { home: sandboxHome, netrcPath, restoreEnv, restoreNetrc, cleanup }
}

type CommandOptions = Partial<Interfaces.Options> & { reset?: boolean }

type TestContext = {
  commandError?: unknown
  config?: Interfaces.Config
  expectExit?: boolean
  expectedExitCode?: number
  expectation?: string
  fs?: () => void
  sandboxHome?: string
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

        if (ctx.sandboxHome) {
          const sandboxEntry = memfs[ctx.sandboxHome] ?? {}
          memfs[ctx.sandboxHome] = {
            ...sandboxEntry,
            '.netrc': sandboxEntry['.netrc'] ?? '',
            '.nimbu': sandboxEntry['.nimbu'] ?? {},
            '.config': sandboxEntry['.config'] ?? {},
            '.cache': sandboxEntry['.cache'] ?? {},
            '.local': sandboxEntry['.local'] ?? { share: {} },
          }
        }

        mockfs(memfs)
      }
    },
  }))
  .register('command', (args: string | string[], opts: CommandOptions = {}) => {
    let sandboxEnv: SandboxEnvironment | undefined
    return {
      async run(ctx) {
        sandboxEnv = createSandboxEnvironment()
        ctx.sandboxHome = sandboxEnv.home

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
        try {
          if (ctx.expectExit) {
            const exitError = ctx.commandError as any
            const actualExit = exitError?.oclif?.exit ?? process.exitCode ?? 0

            if (!exitError || (exitError instanceof Errors.ExitError === false && exitError?.oclif?.exit == null)) {
              const details = exitError
                ? ` Details: name=${exitError.constructor?.name ?? 'unknown'}, message=${exitError.message ?? ''}`
                : ''
              throw new Error(
                `Expected command to exit with code ${ctx.expectedExitCode ?? 'unknown'}, but it completed successfully.${details}`,
              )
            }

            if (ctx.expectedExitCode != null && actualExit !== ctx.expectedExitCode) {
              throw new Error(`Expected exit code ${ctx.expectedExitCode}, but received ${actualExit ?? 'unknown'}.`)
            }
          } else if (ctx.commandError) {
            throw ctx.commandError
          }
        } finally {
          ctx.config = undefined
          ctx.sandboxHome = undefined

          if (sandboxEnv) {
            sandboxEnv.restoreNetrc()
            sandboxEnv.restoreEnv()
            sandboxEnv.cleanup()
            sandboxEnv = undefined
          }
        }
      },
    }
  })
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
