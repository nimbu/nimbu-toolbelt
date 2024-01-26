import { pathExistsSync } from 'fs-extra'
import { resolve as resolvePath } from 'node:path'
import { readSync, write } from 'node-yaml'

import paths = require('../config/paths')

export type AppConfig = {
  dir: string
  glob: string
  host?: string
  id: string
  name: string
}

interface ConfigFile {
  apps?: AppConfig[]
  site?: string
  theme?: string
}

export class Config {
  static defaultHost = 'nimbu.io'

  private _config?: ConfigFile
  private readonly _projectConfig: any

  constructor(projectConfig: any) {
    this._projectConfig = projectConfig
  }

  get apiHost(): string {
    if (this.host.startsWith('http')) {
      const u = new URL(this.host)
      if (u.host) return u.host
    }

    return `api.${this.host}`
  }

  get apiUrl(): string {
    return this.host.startsWith('http') ? this.host : `https://api.${this.host}`
  }

  // Nimbu Cloud Code Config
  get apps(): AppConfig[] {
    if (this.config.apps !== undefined) {
      return this.config.apps.filter((a) => a.host === this.apiHost || (!a.host && this.isDefaultHost))
    }

    return []
  }

  get envHost(): string | undefined {
    return process.env.NIMBU_HOST
  }

  get envSite(): string | undefined {
    return process.env.NIMBU_SITE
  }

  get envTheme(): string | undefined {
    return process.env.NIMBU_THEME
  }

  get host(): string {
    return this.envHost || this.projectHost || Config.defaultHost
  }

  get hostname() {
    return this.host.replace(/https?:\/\//, '')
  }

  // API Configuration
  get isDefaultHost() {
    return this.host === Config.defaultHost || this.host === this.apiUrl
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

  get projectHost(): string | undefined {
    return this._projectConfig?.NIMBU_HOST
  }

  get projectPath(): string {
    return resolvePath(paths.PROJECT_DIRECTORY)
  }

  get projectSite(): string | undefined {
    return this._projectConfig?.NIMBU_SITE
  }

  get projectTheme(): string | undefined {
    return this._projectConfig?.NIMBU_THEME
  }

  get secureHost(): boolean {
    return this.apiUrl.startsWith('https')
  }

  // Nimbu Site Configuration
  get site(): string | undefined {
    const site = this.envSite || this.projectSite || this.config.site
    return site
  }

  // Nimbu Theme Configuration
  get theme() {
    return this.envTheme || this.projectTheme || this.config.theme
  }

  async addApp(app: AppConfig): Promise<void> {
    if (this.config.apps !== undefined) {
      this.config.apps.push({ ...app, host: this.apiHost })
      await this.writeConfig()
    }
  }

  private get config() {
    if (!this._config) {
      const configFile = resolvePath(paths.PROJECT_DIRECTORY, 'nimbu.yml')
      this._config = pathExistsSync(configFile) ? { apps: [], theme: 'default-theme', ...readSync(configFile) } : {}
    }

    if (!this._config) {
      throw new Error('nimbu.yml not found')
    }

    return this._config
  }

  private async writeConfig() {
    const configFile = resolvePath(paths.PROJECT_DIRECTORY, 'nimbu.yml')
    write(configFile, this._config)
  }
}
