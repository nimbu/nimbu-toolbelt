const { readSync, write } = require('node-yaml')
import { pathExistsSync } from 'fs-extra'
import { resolve as resolvePath } from 'path'
import paths = require('../config/paths')
export interface ConfigApp {
  name: string
  id: string
  dir: string
  glob: string
  host?: string
}

interface ConfigFile {
  site?: string
  theme?: string
  apps?: ConfigApp[]
}

export default class Config {
  static defaultHost = 'nimbu.io'

  private _config?: ConfigFile
  private readonly _projectConfig: any

  constructor(projectConfig: any) {
    this._projectConfig = projectConfig
  }

  // API Configuration
  get isDefaultHost() {
    return this.host === Config.defaultHost || this.host === this.apiUrl
  }

  get host(): string {
    return this.envHost || this.projectHost || Config.defaultHost
  }

  get apiUrl(): string {
    return this.host.startsWith('http') ? this.host : `https://api.${this.host}`
  }

  get secureHost(): boolean {
    return this.apiUrl.startsWith('https')
  }

  get apiHost(): string {
    if (this.host.startsWith('http')) {
      const u = new URL(this.host)
      if (u.host) return u.host
    }
    return `api.${this.host}`
  }

  get envHost(): string | undefined {
    return process.env.NIMBU_HOST
  }

  get projectHost(): string | undefined {
    return this._projectConfig.NIMBU_HOST
  }

  get hostname() {
    return this.host.replace(/https?:\/\//, '')
  }

  // Nimbu Cloud Code Config
  get apps(): ConfigApp[] {
    if (this.config.apps !== undefined) {
      return this.config.apps.filter((a) => a.host === this.apiHost || (!a.host && this.isDefaultHost))
    } else {
      return []
    }
  }

  async addApp(app: ConfigApp): Promise<void> {
    if (this.config.apps !== undefined) {
      this.config.apps.push(
        Object.assign({}, app, {
          host: this.apiHost,
        }),
      )
      await this.writeConfig()
    }
  }

  // Nimbu Site Configuration
  get site(): string | undefined {
    const site = this.envSite || this.projectSite || this.config.site
    return site
  }

  get envSite(): string | undefined {
    return process.env.NIMBU_SITE
  }

  get projectSite(): string | undefined {
    return this._projectConfig.NIMBU_SITE
  }

  get projectPath(): string {
    return resolvePath(paths.PROJECT_DIRECTORY)
  }

  get possibleLocales(): string[] {
    return [
      'en',
      'nl',
      'fr',
      'de',
      'es',
      'it',
      'ar',
      'ja',
      'zh',
      'pt',
      'ru',
      'sv',
      'cs',
      'bg',
      'et',
      'fi',
      'ga',
      'el',
      'hr',
      'hu',
      'is',
      'ko',
      'lv',
      'lb',
      'pl',
      'sr',
      'da',
      'gl',
      'eu',
      'ca',
      'hi',
      'lt',
      'no',
      'fa',
      'ro',
      'tr',
      'th',
      'sl',
    ]
  }

  // Nimbu Theme Configuration
  get theme() {
    return this.envTheme || this.projectTheme || this.config.theme
  }

  get envTheme(): string | undefined {
    return process.env.NIMBU_THEME
  }

  get projectTheme(): string | undefined {
    return this._projectConfig.NIMBU_THEME
  }

  private get config() {
    if (!this._config) {
      const configFile = resolvePath(paths.PROJECT_DIRECTORY, 'nimbu.yml')
      if (pathExistsSync(configFile)) {
        this._config = Object.assign({ theme: 'default-theme', apps: [] }, readSync(configFile))
      } else {
        this._config = {}
      }
    }
    return this._config!
  }

  private async writeConfig() {
    const configFile = resolvePath(paths.PROJECT_DIRECTORY, 'nimbu.yml')
    write(configFile, this._config)
  }
}
