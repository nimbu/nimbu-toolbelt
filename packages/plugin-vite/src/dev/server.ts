import chalk from 'chalk'
import debugFactory from 'debug'
import open from 'open'
import path from 'node:path'

import { ProxyServer } from '@nimbu-cli/proxy-server'
import type { InlineConfig, ViteDevServer } from 'vite'

import { createSnippetData, writeSnippets } from '../utils/snippet'
import { EntryPoint } from '../utils/types'

const debug = debugFactory('nimbu:vite')

export interface ViteDevOptions {
  host: string
  port: number
  vitePort: number
  openBrowser: boolean
  debug?: boolean
  templatePath: string
  entryPoints: EntryPoint[]
  viteConfig: InlineConfig
  nimbuClient: any
}

export class ViteDevelopmentServer {
  private proxy?: ProxyServer
  private vite?: ViteDevServer

  constructor(private readonly options: ViteDevOptions) {}

  async start(): Promise<void> {
    debug('Starting Vite development server with proxy integration')
    const { host, port, vitePort, templatePath, entryPoints, viteConfig } = this.options

    const devBaseUrl = `http://${host}:${vitePort}`

    const config: InlineConfig = {
      ...viteConfig,
      root: viteConfig.root ?? templatePath,
      server: {
        ...(viteConfig.server ?? {}),
        host,
        port: vitePort,
        strictPort: true,
      },
    }

    const { createServer } = await import('vite')
    this.vite = await createServer(config)
    await this.vite.listen()
    this.vite.printUrls()

    const entryNames = entryPoints.map((entry) => entry.name)

    const devSnippet = createSnippetData({
      buildTimestamp: new Date().toISOString(),
      chunks: ['vite_client', ...entryNames],
      entries: entryNames,
      js: {
        vite_client: `${devBaseUrl}/@vite/client`,
        ...entryPoints.reduce<Record<string, string>>((memo, entry) => {
          memo[entry.name] = `${devBaseUrl}/${entry.relativePath}`
          return memo
        }, {}),
      },
      css: entryPoints.reduce<Record<string, string[]>>((memo, entry) => {
        memo[entry.name] = []
        return memo
      }, {}),
    })

    await writeSnippets(devSnippet)

    this.proxy = new ProxyServer({
      debug: this.options.debug,
      host,
      nimbuClient: this.options.nimbuClient,
      port,
      templatePath,
    })

    await this.proxy.start()

    console.log(chalk.green(`
Nimbu proxy server ready at http://${host}:${port}`))
    console.log(chalk.cyan(`Vite dev server running at ${devBaseUrl}`))

    if (this.options.openBrowser) {
      await open(`http://${host}:${port}`)
    }
  }

  async stop(): Promise<void> {
    debug('Stopping Vite development server components')
    if (this.vite) {
      await this.vite.close()
      this.vite = undefined
    }

    if (this.proxy) {
      await this.proxy.stop()
      this.proxy = undefined
    }
  }

  isRunning(): boolean {
    return Boolean(this.proxy)
  }
}
