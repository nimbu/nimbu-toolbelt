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
    const {body} = req

    return {
      body,
      headers,
      method,
      path,
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
   * Get user agent for Nimbu simulator
   * This would normally come from Nimbu::Auth.user_agent in Ruby
   */
  private static getUserAgent(): string {
    return `nimbu-toolbelt-node/${process.env.npm_package_version || '1.0.0'}`
  }
}
