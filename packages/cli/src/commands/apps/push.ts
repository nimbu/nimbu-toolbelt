import {
  APIError,
  AppConfig,
  Command,
  IValidationError,
  APITypes as Nimbu,
  isValidationError,
} from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import { readFile } from 'fs-extra'
import { intersection } from 'lodash'
import { dirname, normalize, resolve as resolvePath } from 'node:path'

import { findMatchingFiles } from '../../utils/files'

export default class AppsPush extends Command {
  static description = 'Push your cloud code files to nimbu'

  static flags = {
    app: Flags.string({
      char: 'a',
      description: 'The (local) name of the application to push to (see apps:list and apps:config).',
    }),
  }

  static strict = false

  private _app?: AppConfig
  private _code?: Nimbu.AppFile[]
  private _files?: string[]

  async appConfig(): Promise<AppConfig> {
    if (!this._app) {
      const { flags } = await this.parse(AppsPush)
      if (flags.app) {
        const app = this.nimbuConfig.apps.find((a) => a.name === flags.app)
        if (app) {
          this._app = app
        } else {
          throw new Error('Requested application not found.')
        }
      } else if (this.nimbuConfig.apps.length === 1) {
        // If there is only 1 app, we allow flags.app to be empty
        this._app = this.nimbuConfig.apps[0]
      } else if (this.nimbuConfig.apps.length === 0) {
        throw new Error(`⚠️  No applications configured, please execute ${chalk.bold('apps:config')} first.`)
      } else {
        throw new Error("⚠️  More than 1 application is configured, but you didn't pass the --app flag.")
      }
    }

    if (!this._app) {
      throw new Error(`⚠️  No applications configured, please execute ${chalk.bold('apps:config')} first.`)
    }

    return this._app
  }

  async code(): Promise<Nimbu.AppFile[]> {
    const appConfig = await this.appConfig()

    if (!this._code) {
      this._code = await this.nimbu.get<Nimbu.AppFile[]>(`/apps/${appConfig.id}/code`)
    }

    return this._code
  }

  async execute() {
    this.debug('Getting app config')
    const appConfig = await this.appConfig()

    try {
      const files = await this.files()
      this.log(`Pushing code for app ${appConfig.name}:`)
      for (const file of files) {
        await this.pushFile(file)
      }

      this.log('\n★  Done! ★')
    } catch (error) {
      if (
        error instanceof APIError &&
        error.body?.code === 142 &&
        error.body.errors != null &&
        error.body.errors.length > 0
      ) {
        ux.error(
          error.body.errors
            .map((err: IValidationError | string) => (isValidationError(err) ? err.message : err))
            .join('\n'),
        )
      }

      console.log('BOOM ERROR')
      if (error instanceof Error) {
        ux.error(error.message)
      }
    }
  }

  async files(): Promise<string[]> {
    if (!this._files) {
      const { argv } = (await this.parse(AppsPush)) as { argv: string[] }
      const appConfig = await this.appConfig()
      const filesFound = await findMatchingFiles(appConfig.dir, appConfig.glob)
      this.debug('Found: %s', filesFound)

      this._files = argv.length > 0 ? intersection([...argv], filesFound) : filesFound

      // sort files on require dependencies
      const DependencyGraph = require('dependency-graph').DepGraph
      const graph = new DependencyGraph()

      const regexp = /require\(["']((?:\.\.?\/)*?[\w/-]+)(?:\.js)?["']\)/g

      const names: string[] = []
      const namesWithCode = {}
      const filenamesWithCode = {}

      for (const filename of this._files) {
        const { code, name } = await this.getCode(filename)
        graph.addNode(name)
        names.push(name)
        namesWithCode[filename] = {
          code,
          name,
        }
        filenamesWithCode[name] = filename
      }

      for (const filename of this._files) {
        const { code: codeWithComments, name } = namesWithCode[filename]
        // strip comments as there can be references to files in comments which are not in a loop
        const code = codeWithComments.replaceAll(/\/\*[\S\s]*?\*\/|(?<=[^:])\/\/.*|^\/\/.*/g, '')
        const matches = [...code.matchAll(regexp)]
        for (const match of matches) {
          const requiredFile = match[1]
          try {
            // normalize the match (replace ./ or ../../ in requires)
            let namespace = dirname(name)
            namespace = namespace === '.' ? '' : namespace
            const dependency = normalize(requiredFile.replace('./', namespace)) + '.js'

            if (names.includes(dependency)) {
              graph.addDependency(name, dependency)
            }
          } catch {
            this.error(`⚠️ There is a circular dependency with file ${chalk.bold(filename)}.`)
          }
        }
      }

      const filesInOrder = graph.overallOrder()
      this._files = filesInOrder.map((name: string) => filenamesWithCode[name])
    }

    return this._files || []
  }

  private async createAppFile(app: string, name: string, code: string): Promise<Nimbu.AppFile> {
    return this.nimbu.post<Nimbu.AppFile>(`/apps/${app}/code`, {
      body: {
        code,
        name,
      },
    })
  }

  private async executePush(
    filename: string,
    executor: (app: string, name: string, code: string) => Promise<Nimbu.AppFile>,
  ) {
    const { code, name } = await this.getCode(filename)
    const appConfig = await this.appConfig()
    await executor(appConfig.id, name, code)
    ux.action.stop(chalk.green('✓'))
  }

  private async getCode(filename: string) {
    const appConfig = await this.appConfig()
    const name = filename.replace(`${appConfig.dir}/`, '')
    const resolved = resolvePath(filename)
    const code = await readFile(resolved)

    return { code: code.toString('utf8'), name }
  }

  private async pushExistingFile(filename: string) {
    await this.executePush(filename, (...args) => this.updateAppFile(...args))
  }

  private async pushFile(filename: string) {
    const code = await this.code()
    const appConfig = await this.appConfig()
    const existing = code.find((f) => `${appConfig.dir}/${f.name}` === filename)
    ux.action.start(`  - ${filename}${existing ? '' : ' (new)'}`)
    if (existing) {
      return this.pushExistingFile(filename)
    }

    return this.pushNewFile(filename)
  }

  private async pushNewFile(filename: string) {
    await this.executePush(filename, (...args) => this.createAppFile(...args))
  }

  private async updateAppFile(app: string, name: string, code: string): Promise<Nimbu.AppFile> {
    return this.nimbu.put<Nimbu.AppFile>(`/apps/${app}/code/${name}`, {
      body: {
        code,
      },
    })
  }
}
