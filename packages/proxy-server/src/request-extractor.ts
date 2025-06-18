import { Request } from 'express'

import { RequestMetadata } from './types'

export class RequestExtractor {
  /**
   * Extract metadata from Express request object
   * Mirrors the Ruby logic from base.rb
   */
  static extractMetadata(req: Request): RequestMetadata {
    const method = this.detectHttpMethod(req)
    const path = this.extractPath(req)
    const headers = this.extractHeaders(req)
    const query = req.query as Record<string, string | string[]>
    const { body } = req
    const params = this.extractParams(req)
    const host = this.extractHost(req)
    const port = this.extractPort(req)

    return {
      body,
      headers,
      host,
      method,
      params,
      path,
      port,
      query,
    }
  }

  /**
   * Check if path is favicon
   */
  static isFavicon(path: string): boolean {
    return path.startsWith('/favicon.ico')
  }

  /**
   * Check if path is a private file
   * Mirrors private_file? from base.rb
   */
  static isPrivateFile(req: Request): boolean {
    return req.path.startsWith('/downloads/') && req.query.key !== undefined
  }

  /**
   * Check if path is a static asset that should be served by webpack dev server
   * This includes images, fonts, and webpack resources
   */
  static isStaticAsset(path: string, webpackResources?: string[]): boolean {
    // Check for images and fonts paths
    if (path.startsWith('/images/') || path.startsWith('/fonts/')) {
      return true
    }

    // Check for webpack resources
    return this.isWebpackResource(path, webpackResources)
  }

  /**
   * Check if path is a webpack resource
   * Includes HMR, websockets, and traditional webpack resources
   */
  static isWebpackResource(path: string, webpackResources?: string[]): boolean {
    // Check for Hot Module Replacement (HMR) requests
    if (path.includes('.hot-update.')) {
      return true
    }

    // Check for webpack dev server websocket connections
    if (path.startsWith('/__webpack_hmr') || path.startsWith('/sockjs-node/')) {
      return true
    }

    // Check for webpack manifest and stats files
    if (path.includes('webpack') && (path.endsWith('.json') || path.endsWith('.js'))) {
      return true
    }

    // Original logic for traditional webpack resources in /javascripts/
    if (webpackResources && webpackResources.length > 0 && path.includes('/javascripts/')) {
      const resourcePath = path.replace('/javascripts/', '')
      return webpackResources.includes(resourcePath)
    }

    return false
  }

  /**
   * Detect HTTP method from request
   * Mirrors detect_http_method from base.rb
   */
  private static detectHttpMethod(req: Request): string {
    return req.method.toLowerCase()
  }

  /**
   * Extract headers from request
   * Includes the special X-Nimbu-Simulator header
   */
  private static extractHeaders(req: Request): Record<string, string | string[]> {
    const headers: Record<string, string | string[]> = {}

    // Copy existing headers, filtering out undefined values
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers[key] = value
      }
    }

    // Add X-Nimbu-Simulator header (mirrors headers.rb functionality)
    headers['x-nimbu-simulator'] = this.getUserAgent()

    // Set Rack-specific headers to trick the Ruby server into interpreting the correct HTTP method
    headers.REQUEST_METHOD = req.method.toUpperCase()
    headers.REQUEST_PATH = req.path
    headers.PATH_INFO = req.path
    headers.REQUEST_URI = req.url || req.path
    headers.QUERY_STRING = req.url && req.url.includes('?') ? req.url.split('?')[1] : ''

    return headers
  }

  /**
   * Extract and normalize path from request
   * Mirrors extract_path from base.rb
   */
  private static extractPath(req: Request): string {
    if (req.path === '/') {
      return req.path
    }

    // Remove trailing slash
    return req.path.replace(/\/$/, '')
  }

  /**
   * Extract parameters from request, merging query and body data
   * Mirrors Sinatra's request.params behavior where query and form data are merged
   */
  private static extractParams(req: Request): Record<string, any> {
    const params: Record<string, any> = {}

    // Start with query parameters
    const query = req.query as Record<string, string | string[]>
    Object.assign(params, query)

    // For POST, PUT, PATCH requests, merge in body data
    const method = req.method.toUpperCase()
    if (['PATCH', 'POST', 'PUT'].includes(method) && req.body && typeof req.body === 'object' && req.body !== null) {
      // Handle form-encoded data or JSON body
      Object.assign(params, req.body)
    }

    return params
  }

  /**
   * Extract host from request headers
   */
  private static extractHost(req: Request): string {
    const hostHeader = (req.get ? req.get('host') : req.headers.host) || req.headers.host
    if (typeof hostHeader === 'string') {
      // Remove port from host if present (e.g., "localhost:3000" -> "localhost")
      return hostHeader.split(':')[0]
    }

    return 'localhost'
  }

  /**
   * Extract port from request
   * Tries to get port from host header, connection, or falls back to defaults
   */
  private static extractPort(req: Request): number {
    const hostHeader = (req.get ? req.get('host') : req.headers.host) || req.headers.host
    if (typeof hostHeader === 'string' && hostHeader.includes(':')) {
      const portStr = hostHeader.split(':')[1]
      const port = Number.parseInt(portStr, 10)
      if (!Number.isNaN(port)) {
        return port
      }
    }

    // Check if connection has socket with localPort
    const connection = (req as any).connection || (req as any).socket
    if (connection && connection.localPort) {
      return connection.localPort
    }

    // Default based on protocol
    return req.secure ? 443 : 80
  }

  /**
   * Get user agent for Nimbu simulator
   * This would normally come from Nimbu::Auth.user_agent in Ruby
   */
  private static getUserAgent(): string {
    return `nimbu-toolbelt-node/${process.env.npm_package_version || '1.0.0'}`
  }
}
