import { ISimulatorResponse } from '@nimbu-cli/command/lib/nimbu/client'
import { Response } from 'express'

export class ResponseProcessor {
  /**
   * Get content type from headers
   */
  static getContentType(headers: Record<string, string>): string {
    return headers['content-type'] || headers['Content-Type'] || 'text/html'
  }

  /**
   * Handle error responses
   */
  static handleError(error: Error, res: Response): void {
    console.error('Proxy error:', error.message)

    // Authentication errors
    if (error.message.includes('Authentication required') || error.message.includes('invalid_token')) {
      res.status(401).json({
        error: 'Authentication Required',
        message: 'Valid Nimbu API authentication is required. Please run: nimbu auth:login',
      })
    } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is invalid or expired. Please run: nimbu auth:login',
      })
    } else if (error.message.includes('Invalid site id given or insufficient access')) {
      res.status(403).json({
        error: 'Site Access Error',
        message: 'Invalid site id given or insufficient access. Please check your site configuration in nimbu.yml.',
      })
    } else if (error.message.includes('Forbidden') || error.message.includes('403')) {
      res.status(403).json({
        error: 'Access Forbidden',
        message: 'API key does not have permission to access this site. Check your site configuration.',
      })
    } else if (error.message.includes('Site configuration missing')) {
      res.status(500).json({
        error: 'Configuration Error',
        message: error.message,
      })
    } else if (error.message.includes('Simulator API error')) {
      // Extract status code from error message
      const statusMatch = error.message.match(/(\d{3})/)
      const status = statusMatch ? Number.parseInt(statusMatch[1], 10) : 502

      res.status(status).json({
        error: 'Simulator API Error',
        message: error.message,
      })
    } else if (error.message.includes('Failed to connect')) {
      res.status(502).json({
        error: 'Gateway Error',
        message: 'Failed to connect to Nimbu simulator API',
      })
    } else if (error.message.includes('Invalid base64')) {
      res.status(502).json({
        error: 'Response Processing Error',
        message: 'Invalid response format from simulator',
      })
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'Cannot connect to Nimbu API. Check your internet connection.',
      })
    } else if (error.message.includes('Proxy error:')) {
      // Handle other proxy-specific errors from the API
      res.status(400).json({
        error: 'API Error',
        message: error.message,
      })
    } else {
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
      })
    }
  }

  /**
   * Check if response is binary content
   */
  static isBinaryContent(contentType: string): boolean {
    const binaryTypes = [
      'image/',
      'audio/',
      'video/',
      'application/pdf',
      'application/zip',
      'application/octet-stream',
      'font/',
    ]

    return binaryTypes.some((type) => contentType.includes(type))
  }

  /**
   * Process simulator response and send to Express response
   */
  static processResponse(simulatorResponse: ISimulatorResponse, res: Response): void {
    // Set status code
    res.status(simulatorResponse.status)

    // Set headers from simulator response
    this.setHeaders(res, simulatorResponse.headers)

    // Handle response body based on encoding
    const contentType = this.getContentType(simulatorResponse.headers)

    if (typeof simulatorResponse.body === 'string') {
      // Simulator API ALWAYS returns base64 encoded data, so always try to decode
      try {
        const decodedBody = Buffer.from(simulatorResponse.body, 'base64')

        if (this.isBinaryContent(contentType)) {
          // Send binary data directly as Buffer
          res.send(decodedBody)
        } else {
          // Send text content as UTF-8 string
          res.send(decodedBody.toString('utf8'))
        }
      } catch (error) {
        // If base64 decoding fails, fall back to treating as plain text
        console.warn('Failed to decode base64 response body, sending as plain text:', error)
        
        if (this.isBinaryContent(contentType) && typeof simulatorResponse.body === 'string') {
          // Convert string to buffer for binary content
          res.send(Buffer.from(simulatorResponse.body))
        } else {
          // Send text content directly
          res.send(simulatorResponse.body)
        }
      }
    } else {
      // Handle non-string response bodies (shouldn't happen with simulator API)
      res.send(simulatorResponse.body)
    }
  }

  /**
   * Check if response should be cached
   */
  static shouldCache(headers: Record<string, string>): boolean {
    const cacheControl = headers['cache-control']
    const { expires } = headers
    const { etag } = headers

    // Don't cache if explicitly told not to
    if (
      cacheControl &&
      (cacheControl.includes('no-cache') || cacheControl.includes('no-store') || cacheControl.includes('private'))
    ) {
      return false
    }

    // Cache if has explicit cache headers
    return Boolean(cacheControl || expires || etag)
  }

  /**
   * Filter headers that shouldn't be forwarded to client
   */
  private static filterHeaders(headers: Record<string, string>): Record<string, string> {
    const filtered: Record<string, string> = {}

    // Headers to exclude
    const excludeHeaders = new Set([
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
    ])

    for (const [name, value] of Object.entries(headers)) {
      const lowerName = name.toLowerCase()

      if (!excludeHeaders.has(lowerName)) {
        filtered[name] = value
      }
    }

    return filtered
  }

  /**
   * Set response headers from simulator response
   */
  private static setHeaders(res: Response, headers: Record<string, string>): void {
    // Filter out headers that shouldn't be forwarded
    const filteredHeaders = this.filterHeaders(headers)

    for (const [name, value] of Object.entries(filteredHeaders)) {
      try {
        res.set(name, value)
      } catch (error) {
        // Skip invalid headers
        console.warn(`Failed to set header ${name}: ${error}`)
      }
    }
  }
}
