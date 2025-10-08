import type { InlineConfig, ViteDevServer } from 'vite'

import { ProxyServer } from '@nimbu-cli/proxy-server'
import chalk from 'chalk'
import debugFactory from 'debug'
import { Server as HttpServer, createServer as createHttpServer } from 'node:http'
import open from 'open'

import { createSnippetData, writeSnippets } from '../utils/snippet'
import { EntryPoint } from '../utils/types'

const debug = debugFactory('nimbu:vite')

type ExpressLikeMiddleware = (req: unknown, res: unknown, next: (err?: unknown) => void) => void

export interface ViteDevOptions {
  debug?: boolean
  entryPoints: EntryPoint[]
  host: string
  nimbuClient: any
  openBrowser: boolean
  port: number
  templatePath: string
  viteConfig: InlineConfig
}

export class ViteDevelopmentServer {
  private proxy?: ProxyServer
  private vite?: ViteDevServer
  private httpServer?: HttpServer

  private readonly options: ViteDevOptions

  constructor(options: ViteDevOptions) {
    this.options = options
  }

  async start(): Promise<void> {
    debug('Starting Vite development server in middleware mode')
    const {
      debug: proxyDebug,
      entryPoints,
      host,
      nimbuClient,
      openBrowser,
      port,
      templatePath,
      viteConfig,
    } = this.options

    const devBaseUrl = `http://${host}:${port}`

    this.proxy = new ProxyServer({
      debug: proxyDebug,
      host,
      nimbuClient,
      port,
      templatePath,
    })

    const httpServer = createHttpServer(this.proxy.expressApp)
    this.httpServer = httpServer

    const existingHmrConfig =
      typeof viteConfig.server?.hmr === 'object' ? viteConfig.server.hmr : undefined

    const hmrConfig = {
      ...(existingHmrConfig ? { ...existingHmrConfig } : {}),
      server: httpServer,
    }

    const { createServer } = await import('vite')
    this.vite = await createServer({
      ...viteConfig,
      appType: 'custom',
      root: viteConfig.root ?? templatePath,
      server: {
        ...viteConfig.server,
        hmr: hmrConfig,
        middlewareMode: true,
      },
    })

    this.proxy.use(this.vite.middlewares as ExpressLikeMiddleware)

    await new Promise<void>((resolve, reject) => {
      httpServer.on('error', (error) => {
        reject(error)
      })

      httpServer.listen(port, host, () => {
        const proxy = this.proxy as ProxyServer & {
          registerExternalServer(server: HttpServer, serverHost: string, serverPort: number): void
        }

        proxy.registerExternalServer(httpServer, host, port)
        resolve()
      })
    })

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

    console.log(chalk.green(`
Nimbu proxy server ready at http://${host}:${port}`))
    console.log(chalk.cyan('Vite dev middleware attached (HMR on the same port)'))

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

    this.httpServer = undefined
  }

  isRunning(): boolean {
    return Boolean(this.proxy)
  }
}
