/* eslint-disable import/no-named-as-default-member */
import { Config, Errors, Interfaces } from '@oclif/core'
import { captureOutput } from '@oclif/test'
import mockfs from 'mock-fs'
import nock from 'nock'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve as resolvePath } from 'node:path'
import sinon from 'sinon'

import { AbsPath, MockFSHelper } from './utils'

const cliRoot = resolvePath(__dirname, '../..')

const Netrc: any = require('netrc-parser')

type SandboxEnvironment = {
  cleanup: () => void
  home: string
  netrcPath: string
  restoreEnv: () => void
  restoreNetrc: () => void
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
    HOMEDRIVE: process.env.HOMEDRIVE,
    HOMEPATH: process.env.HOMEPATH,
    USERPROFILE: process.env.USERPROFILE,
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME,
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME,
    XDG_DATA_HOME: process.env.XDG_DATA_HOME,
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
      rmSync(sandboxHome, { force: true, recursive: true })
    } catch {
      // ignore removal failures in CI/Windows environments
    }
  }

  return {
    cleanup,
    home: sandboxHome,
    netrcPath,
    restoreEnv,
    restoreNetrc,
  }
}

type CommandOptions = Partial<Interfaces.Options> & { reset?: boolean }

type Step =
  | { args: string[]; kind: 'command'; options: CommandOptions }
  | { clear?: boolean; kind: 'env'; vars: Record<string, string> }
  | { code: number; kind: 'exit' }
  | { fn: () => Promise<void> | void; kind: 'do' }
  | { kind: 'disableNetConnect' }
  | { kind: 'fs'; memfs: any }
  | { kind: 'stderr' }
  | { kind: 'stdout' }
  | { kind: 'stub'; object: any; property: number | string | symbol; replacement: any }

type TestContext = {
  commandError?: unknown
  sandboxHome?: string
  stderr?: string
  stdout?: string
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

const applyMockFs = (memfs: any, sandboxHome?: string) => {
  const helper = new MockFSHelper(memfs)
  helper.addFile(new AbsPath('./package.json'))
  helper.addDirContents(new AbsPath('./test/'))
  helper.addDirContents(new AbsPath('./src/'))
  helper.addDirContents(new AbsPath('./node_modules/typescript'))
  helper.addDirContents(new AbsPath('./node_modules/node-yaml'))
  helper.addDirContents(new AbsPath('./node_modules/@oclif'))

  if (sandboxHome) {
    const sandboxEntry = memfs[sandboxHome] ?? {}
    memfs[sandboxHome] = {
      ...sandboxEntry,
      '.cache': sandboxEntry['.cache'] ?? {},
      '.config': sandboxEntry['.config'] ?? {},
      '.local': sandboxEntry['.local'] ?? { share: {} },
      '.netrc': sandboxEntry['.netrc'] ?? '',
      '.nimbu': sandboxEntry['.nimbu'] ?? {},
    }
  }

  mockfs(memfs)
}

class TestChain {
  constructor(private readonly steps: Step[] = []) {}

  private clone(step: Step) {
    return new TestChain([...this.steps, step])
  }

  env(vars: Record<string, string>, options: { clear?: boolean } = {}) {
    return this.clone({ clear: options.clear, kind: 'env', vars })
  }

  stub<T extends object, K extends keyof T>(object: T, property: K, replacement: any) {
    return this.clone({
      kind: 'stub',
      object,
      property,
      replacement,
    })
  }

  stdout() {
    return this.clone({ kind: 'stdout' })
  }

  stderr() {
    return this.clone({ kind: 'stderr' })
  }

  command(args: string | string[], options: CommandOptions = {}) {
    return this.clone({ args: castArray(args), kind: 'command', options })
  }

  exit(code: number) {
    return this.clone({ code, kind: 'exit' })
  }

  do(fn: () => Promise<void> | void) {
    return this.clone({ fn, kind: 'do' })
  }

  fs(memfs: any) {
    return this.clone({ kind: 'fs', memfs })
  }

  disableNetConnect() {
    return this.clone({ kind: 'disableNetConnect' })
  }

  it(title: string, handler?: (ctx: TestContext) => Promise<void> | void) {
    const { steps } = this
    it(title, async () => {
      const context: TestContext = {}
      const stubs: sinon.SinonStub[] = []
      const envOriginals = new Map<string, string | undefined>()
      const doCallbacks: Array<() => Promise<void> | void> = []
      let memfsConfig: any
      let disableNetwork = false
      let expectExit = false
      let expectedExitCode: number | undefined
      let captureStdout = false
      let captureStderr = false
      let commandStep: Extract<Step, { kind: 'command' }> | undefined
      let sandboxEnv: SandboxEnvironment | undefined
      let memfsApplied = false

      for (const step of steps) {
        switch (step.kind) {
          case 'command': {
            commandStep = step
            break
          }

          case 'disableNetConnect': {
            if (!disableNetwork) {
              nock.disableNetConnect()
              disableNetwork = true
            }

            break
          }

          case 'do': {
            doCallbacks.push(step.fn)
            break
          }

          case 'env': {
            for (const [key, value] of Object.entries(step.vars)) {
              envOriginals.set(key, process.env[key])
              if (step.clear) {
                delete process.env[key]
              }

              process.env[key] = value
            }

            break
          }

          case 'exit': {
            expectExit = true
            expectedExitCode = step.code
            break
          }

          case 'fs': {
            memfsConfig = step.memfs
            break
          }

          case 'stderr': {
            captureStderr = true
            break
          }

          case 'stdout': {
            captureStdout = true
            break
          }

          case 'stub': {
            const stub = sinon.stub(step.object, step.property)
            if (typeof step.replacement === 'function') {
              stub.callsFake(step.replacement)
            } else {
              stub.value(step.replacement)
            }

            stubs.push(stub)
            break
          }

          default: {
            break
          }
        }
      }

      if (!commandStep) {
        throw new Error('CLI test missing command step')
      }

      try {
        for (const fn of doCallbacks) {
          await fn()
        }

        const capture = await captureOutput(
          async () => {
            sandboxEnv = createSandboxEnvironment()
            context.sandboxHome = sandboxEnv.home

            if (memfsConfig) {
              applyMockFs(memfsConfig, sandboxEnv.home)
              memfsApplied = true
            }

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { reset: _, ...loadOpts } = commandStep.options
            const config = await loadCliConfig(loadOpts)

            const argv = commandStep.args
            const [id, ...extra] = argv
            await config.runHook('init', { argv: extra, id })
            await config.runCommand(id, extra)
          },
          { stripAnsi: true },
        )

        if (captureStdout) {
          context.stdout = capture.stdout
        }

        if (captureStderr) {
          context.stderr = capture.stderr
        }

        context.commandError = capture.error

        const exitError = capture.error as any
        const actualExit =
          exitError?.oclif?.exit ?? (exitError instanceof Errors.ExitError ? exitError.oclif?.exit : undefined)

        if (expectExit) {
          if (!exitError) {
            throw new Error(
              `Expected command to exit with code ${expectedExitCode ?? 'unknown'}, but it completed successfully.`,
            )
          }

          if (expectedExitCode != null && actualExit !== expectedExitCode) {
            throw new Error(`Expected exit code ${expectedExitCode}, but received ${actualExit ?? 'unknown'}.`)
          }
        } else if (exitError) {
          throw exitError
        }

        if (handler) {
          await handler(context)
        }
      } finally {
        for (const stub of stubs) {
          stub.restore()
        }

        for (const [key, value] of envOriginals.entries()) {
          if (value === undefined) {
            delete process.env[key]
          } else {
            process.env[key] = value
          }
        }

        if (memfsApplied) {
          mockfs.restore()
        }

        if (sandboxEnv) {
          sandboxEnv.restoreNetrc()
          sandboxEnv.restoreEnv()
          sandboxEnv.cleanup()
        }

        if (disableNetwork) {
          nock.enableNetConnect()
        }
      }
    })
  }
}

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

export const test = new TestChain([{ kind: 'disableNetConnect' }])

export default test

export { expect } from 'chai'
