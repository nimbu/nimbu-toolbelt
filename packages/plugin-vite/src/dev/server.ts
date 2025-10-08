import type { InlineConfig, ViteDevServer } from 'vite'

import { ProxyServer } from '@nimbu-cli/proxy-server'
import chalk from 'chalk'
import debugFactory from 'debug'
import open from 'open'

import { createSnippetData, writeSnippets } from '../utils/snippet'
import { EntryPoint } from '../utils/types'

const debug = debugFactory('nimbu:vite')

export interface ViteDevOptions {
  debug?: boolean
  entryPoints: EntryPoint[]
  host: string
  nimbuClient: any
  openBrowser: boolean
  port: number
  templatePath: string
  viteConfig: InlineConfig
  vitePort: number
}

export class ViteDevelopmentServer {
  private proxy?: ProxyServer
  private vite?: ViteDevServer

  private readonly options: ViteDevOptions

  constructor(options: ViteDevOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    debug('Starting Vite development server with proxy integration')
    const {
      debug: proxyDebug,
      entryPoints,
      host,
      nimbuClient,
      openBrowser,
      port,
      templatePath,
      viteConfig,
      vitePort,
    } = this.options

    const devBaseUrl = `http://${host}:${vitePort}`

    const config: InlineConfig = {
      ...viteConfig,
      root: viteConfig.root ?? templatePath,
      server: {
        ...viteConfig.server,
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
    const cssAssets: Record<string, string[]> = {}
    const entryJs: Record<string, string> = {}

    for (const { name, relativePath } of entryPoints) {
      cssAssets[name] = []
      entryJs[name] = `${devBaseUrl}/${relativePath}`
    }

    const devSnippet = createSnippetData({
      buildTimestamp: new Date().toISOString(),
      chunks: ['vite_client', ...entryNames],
      css: cssAssets,
      entries: entryNames,
      js: {
        vite_client: `${devBaseUrl}/@vite/client`,
        ...entryJs,
      },
    })

    await writeSnippets(devSnippet)

    this.proxy = new ProxyServer({
      debug: proxyDebug,
      host,
      nimbuClient,
      port,
      templatePath,
    })

    await this.proxy.start()

    console.log(chalk.green(`
Nimbu proxy server ready at http://${host}:${port}`))
    console.log(chalk.cyan(`Vite dev server running at ${devBaseUrl}`))

    if (openBrowser) {
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
