import { ProxyServer } from './server'
import { ProxyServerOptions } from './types'

export interface WebpackIntegrationOptions extends ProxyServerOptions {
  webpackResources?: string[]
}

export class WebpackIntegration {
  private proxyServer: ProxyServer

  constructor(options: WebpackIntegrationOptions) {
    if (!options.nimbuClient) {
      throw new Error('nimbuClient is required for WebpackIntegration')
    }

    this.proxyServer = new ProxyServer({
      ...options,
      // Default webpack integration settings
      host: options.host || 'localhost',
      port: options.port || 4568,
    })
  }

  /**
   * Get the Express app for advanced integration
   */
  get expressApp() {
    return this.proxyServer.expressApp
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.proxyServer.running
  }

  /**
   * Start the proxy server for webpack integration
   */
  async start(options?: Partial<WebpackIntegrationOptions>): Promise<void> {
    // Set up webpack-specific middleware
    this.setupWebpackMiddleware(options?.webpackResources)

    await this.proxyServer.start()
  }

  /**
   * Stop the proxy server
   */
  async stop(): Promise<void> {
    await this.proxyServer.stop()
  }

  /**
   * Set up middleware specific to webpack integration
   */
  private setupWebpackMiddleware(webpackResources?: string[]): void {
    // Add middleware to handle webpack-specific headers
    this.proxyServer.use((req, res, next) => {
      // Add webpack development headers
      if (process.env.NODE_ENV === 'development') {
        res.set('X-Nimbu-Proxy', 'node')
        res.set('X-Webpack-Integration', 'true')
      }

      // Store webpack resources for request filtering
      if (webpackResources) {
        req.webpackResources = webpackResources
      }

      next()
    })

    // Add middleware for webpack HMR support
    this.proxyServer.use((req, res, next) => {
      // Handle webpack HMR paths
      if (req.path.includes('__webpack_hmr') || req.path.includes('sockjs-node')) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'HMR handled by webpack-dev-server',
        })
      }

      next()
    })
  }
}

/**
 * Factory function to create webpack integration
 */
export function createWebpackIntegration(options: WebpackIntegrationOptions): WebpackIntegration {
  return new WebpackIntegration(options)
}

/**
 * Drop-in replacement for the Ruby nimbu server
 */
export async function startNimbuNodeServer(
  port: number,
  options: Omit<WebpackIntegrationOptions, 'port'>,
): Promise<WebpackIntegration> {
  const integration = new WebpackIntegration({ ...options, port })
  await integration.start()
  return integration
}

// Extend Express Request interface for webpack resources
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      webpackResources?: string[]
    }
  }
}
