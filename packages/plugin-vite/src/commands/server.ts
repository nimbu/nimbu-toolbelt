import { Command, displayNimbuHeader } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'
import chalk from 'chalk'
import detectPort from 'detect-port'
import fs from 'node:fs'
import path from 'node:path'

import { ViteDevelopmentServer } from '../dev/server'
import { resolveEntryPoints } from '../utils/entries'
import { resolveViteConfig } from '../utils/vite-config'

interface ServerFlags {
  debug: boolean
  host?: string
  noopen: boolean
  port: number
  'vite-port': number
}

export default class Server extends Command {
  static description = 'run the development server (vite)'

  static flags = {
    debug: Flags.boolean({
      default: false,
      description: 'Enable verbose proxy logging',
    }),
    host: Flags.string({
      description: 'Hostname to bind the proxy and Vite servers on',
      env: 'HOST',
    }),
    noopen: Flags.boolean({
      default: false,
      description: `Do not automatically open the browser`,
    }),
    port: Flags.integer({
      default: 4567,
      description: 'Port for the Nimbu proxy server',
      env: 'DEFAULT_PORT',
    }),
    'vite-port': Flags.integer({
      default: 5173,
      description: 'Port for the Vite dev server',
      env: 'VITE_PORT',
    }),
  }

  private devServer?: ViteDevelopmentServer

  async execute() {
    displayNimbuHeader()

    const { flags } = await this.parse(Server)
    const typedFlags = flags as unknown as ServerFlags

    const host = typedFlags.host ?? 'localhost'
    const port = typedFlags.port ?? 4567
    const vitePort = typedFlags['vite-port'] ?? 5173

    await this.ensurePortAvailable(port, 'proxy')
    await this.ensurePortAvailable(vitePort, 'vite')

    await this.nimbu.validateLogin()

    const root = process.cwd()
    const fallbackEntries = this.resolveFallbackEntries(root)
    const { config } = await resolveViteConfig('serve', {
      root,
      server: {
        host,
        port: vitePort,
      },
    })

    const entryPoints = resolveEntryPoints(config.root ?? root, config, fallbackEntries)

    this.devServer = new ViteDevelopmentServer({
      debug: typedFlags.debug,
      entryPoints,
      host,
      nimbuClient: this.nimbu,
      openBrowser: !typedFlags.noopen,
      port,
      templatePath: root,
      viteConfig: config,
      vitePort,
    })

    try {
      await this.devServer.start()
      await this.waitForShutdown()
    } catch (error) {
      console.error(chalk.red('Failed to start Vite development server'))
      console.error(error)
      await this.devServer?.stop()
      this.exit(1)
    }
  }

  private resolveFallbackEntries(root: string): Record<string, string> {
    const candidates = [
      this.buildConfig?.JS_ENTRY,
      'index.tsx',
      'index.ts',
      'index.jsx',
      'index.js',
      'main.tsx',
      'main.ts',
      'main.jsx',
      'main.js',
    ].filter(Boolean)

    for (const candidate of candidates) {
      const entryPath = path.join(root, 'src', candidate)
      if (fs.existsSync(entryPath)) {
        return { app: entryPath }
      }
    }

    return { app: path.join(root, 'src', 'index.ts') }
  }

  private async ensurePortAvailable(port: number, label: string) {
    const available = await detectPort(port)
    if (available !== port) {
      throw new Error(`${label} port ${port} is unavailable. Suggested free port: ${available}`)
    }
  }

  private async waitForShutdown() {
    await new Promise<void>((resolve) => {
      const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']

      const shutdown = async () => {
        for (const signal of signals) {
          process.off(signal, shutdown)
        }

        await this.devServer?.stop()
        resolve()
      }

      for (const signal of signals) {
        process.on(signal, shutdown)
      }
    })
  }
}
