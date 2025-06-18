import chalk from 'chalk'
import compression from 'compression'
import cors from 'cors'
import express, { Express, Request, RequestHandler, Response } from 'express'
import helmet from 'helmet'
import multer from 'multer'
import { Server } from 'node:http'
import path from 'node:path'

import { FileProcessor } from './file-processor'
import { ResponseProcessor } from './response-processor'
import { SimulatorFormatter } from './simulator-formatter'
import { TemplatePacker } from './template-packer'
import { ProxyServerOptions, ServerAdapter } from './types'

export class ProxyServer implements ServerAdapter {
  private app: Express
  private customMiddlewares: RequestHandler[] = []
  private isRunning = false
  private nimbuClient: any
  private server: Server | null = null
  private simulatorFormatter: SimulatorFormatter
  private templatePacker: TemplatePacker
  private upload: multer.Multer

  constructor(private options: ProxyServerOptions) {
    if (!options.nimbuClient) {
      throw new Error('nimbuClient is required')
    }

    this.app = express()
    this.nimbuClient = options.nimbuClient

    // Initialize components
    this.templatePacker = new TemplatePacker(options.templatePath || process.cwd())
    this.simulatorFormatter = new SimulatorFormatter(this.templatePacker)
    this.upload = multer(FileProcessor.createMulterConfig())

    this.setupMiddleware()
    this.setupRoutes()
  }

  get expressApp(): Express {
    return this.app
  }

  get running(): boolean {
    return this.isRunning
  }

  async start(options?: ProxyServerOptions): Promise<void> {
    const config = { ...this.options, ...options }
    const host = config.host || 'localhost'

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(config.port, host, () => {
        console.log(`Proxy server running on http://${host}:${config.port}`)
        this.isRunning = true
        resolve()
      })

      this.server.on('error', (error) => {
        console.error('Server error:', error)
        reject(error)
      })

      // Set server timeouts for security
      this.server.timeout = 30_000 // 30 seconds
      this.server.keepAliveTimeout = 5000 // 5 seconds
    })
  }

  async stop(): Promise<void> {
    if (this.server && this.isRunning) {
      return new Promise((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.server!.close(() => {
          console.log('Proxy server stopped')
          this.isRunning = false
          this.server = null
          resolve()
        })
      })
    }
  }

  use(middleware: RequestHandler): void {
    this.customMiddlewares.push(middleware)
  }

  /**
   * Log debug information about the payload being sent to the API
   * Excludes template code for readability
   */
  private logDebugPayload(payload: any, req: Request): void {
    console.log(chalk.cyan('\n=== DEBUG: API Request Data ==='))
    
    // Create a copy of the payload without the template code
    const debugPayload = JSON.parse(JSON.stringify(payload))
    
    // Remove or truncate the template code for readability
    if (debugPayload.simulator?.code) {
      const codeLength = debugPayload.simulator.code.length
      debugPayload.simulator.code = `<BASE64_TEMPLATE_CODE length=${codeLength}>`
    }
    
    console.log(chalk.yellow('Request:'), {
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    })
    
    console.log(chalk.yellow('Payload to API:'))
    console.log(JSON.stringify(debugPayload, null, 2))
    
    console.log(chalk.cyan('=== END DEBUG ===\n'))
  }

  /**
   * Handle authentication-specific errors and provide helpful messages
   */
  private handleAuthenticationError(error: Error): Error {
    const authContext = this.nimbuClient.getAuthContext()

    // Check for common authentication issues
    if (!authContext.token) {
      return new Error('Authentication required: No API token found. Please run: nimbu auth:login')
    }

    if (!authContext.site) {
      return new Error('Site configuration missing: No site selected. Please run: nimbu sites:use <site-name>')
    }

    // Pass through original error if not auth-related
    return error
  }

  /**
   * Log debug information about the response from the API
   */
  private logDebugResponse(response: any): void {
    console.log(chalk.magenta('\n=== DEBUG: API Response Data ==='))
    
    // Create a copy of the response without the body content for readability
    const debugResponse = { ...response }
    if (debugResponse.body) {
      const bodyLength = debugResponse.body.length
      debugResponse.body = `<BASE64_BODY_CONTENT length=${bodyLength}>`
    }
    
    console.log(chalk.yellow('Response from API:'))
    console.log(JSON.stringify(debugResponse, null, 2))
    
    console.log(chalk.magenta('=== END DEBUG ===\n'))
  }

  private async processRequest(req: Request, res: Response): Promise<void> {
    try {
      // Verify authentication before processing
      const authContext = this.nimbuClient.getAuthContext()
      if (!authContext.token) {
        throw new Error('Authentication required')
      }

      if (!authContext.site) {
        throw new Error('Site configuration missing')
      }

      // Build simulator payload
      const payload = await this.simulatorFormatter.buildSimulatorPayload(req, this.options.templatePath)

      // Debug logging for API requests (excluding template code for readability)
      if (this.options.debug) {
        this.logDebugPayload(payload, req)
      }

      // Send request to simulator API using nimbuClient
      const simulatorResponse = await this.nimbuClient.simulatorRender(payload)

      // Debug logging for API response
      if (this.options.debug) {
        this.logDebugResponse(simulatorResponse)
      }

      // Process and return response
      ResponseProcessor.processResponse(simulatorResponse, res)
    } catch (error) {
      // Enhanced error handling for authentication issues
      const authError = this.handleAuthenticationError(error as Error)
      ResponseProcessor.handleError(authError, res)
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: false, // Disable CSP for development
        crossOriginEmbedderPolicy: false,
      }),
    )

    // CORS for development
    this.app.use(
      cors({
        credentials: true,
        origin: true,
      }),
    )

    // Compression
    this.app.use(compression() as RequestHandler)

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }))

    // Request logging
    this.app.use((req: Request, res: Response, next) => {
      const originalSend = res.send

      res.send = function (data) {
        const getStatusColor = (status: number) => {
          if (status >= 200 && status < 400) return chalk.green(`(${status})`)
          if (status >= 400 && status < 500) return chalk.yellow(`(${status})`)

          return chalk.red(`(${status})`)
        }

        console.log(
          `${chalk.dim(new Date().toISOString())} ${req.method} ${req.path} ${getStatusColor(res.statusCode)}`,
        )

        return originalSend.call(this, data)
      }

      next()
    })

    // Custom middlewares placeholder - will be applied before routes
    this.app.use((req: Request, res: Response, next) => {
      // Apply custom middlewares
      let index = 0
      const applyNext = () => {
        if (index < this.customMiddlewares.length) {
          const middleware = this.customMiddlewares[index++]
          middleware(req, res, applyNext)
        } else {
          next()
        }
      }

      applyNext()
    })
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (_req: Request, res: Response) => {
      const authContext = this.nimbuClient.getAuthContext()
      res.json({
        nimbu: {
          apiHost: authContext.apiHost,
          authenticated: Boolean(authContext.token),
          site: authContext.site,
        },
        status: 'ok',
        timestamp: new Date().toISOString(),
      })
    })

    // Static file serving - serve images, fonts, css, js from project directory
    this.app.use('/images', express.static(path.join(this.options.templatePath || process.cwd(), 'images')))
    this.app.use('/fonts', express.static(path.join(this.options.templatePath || process.cwd(), 'fonts')))
    this.app.use('/css', express.static(path.join(this.options.templatePath || process.cwd(), 'css')))
    this.app.use('/stylesheets', express.static(path.join(this.options.templatePath || process.cwd(), 'stylesheets')))
    this.app.use('/js', express.static(path.join(this.options.templatePath || process.cwd(), 'js')))
    this.app.use('/javascripts', express.static(path.join(this.options.templatePath || process.cwd(), 'javascripts')))

    // Main proxy route - handle all requests
    this.app.all('*', async (req: Request, res: Response) => {
      try {
        // Check if request should be handled by simulator
        if (!SimulatorFormatter.shouldHandleRequest(req)) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'Resource not handled by proxy server',
          })
        }

        // Handle multipart data if present
        if (FileProcessor.hasMultipartData(req)) {
          // Use multer to parse multipart data
          const multerHandler = this.upload.any()
          multerHandler(req as any, res as any, async (err: any) => {
            if (err) {
              console.error('Multer error:', err)
              return ResponseProcessor.handleError(new Error('File upload error'), res)
            }

            // Process the request with files
            await this.processRequest(req, res)
          })
        } else {
          // Process regular request
          await this.processRequest(req, res)
        }
      } catch (error) {
        ResponseProcessor.handleError(error as Error, res)
      }
    })
  }
}
