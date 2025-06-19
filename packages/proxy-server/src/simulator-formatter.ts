import { Request } from 'express'

import { RequestExtractor } from './request-extractor'
import { TemplatePacker } from './template-packer'
import { RequestMetadata } from './types'

export interface SimulatorRequestData {
  simulator: {
    code: string
    files?: Record<string, string>
    method: string
    multipart?: string
    path: string
    request: {
      body?: string
      headers: string
      host: string
      method: string
      params: Record<string, string>
      port: number
      query: string
      rawBody?: string
    }
    version: string
  }
}

export class SimulatorFormatter {
  // eslint-disable-next-line no-useless-constructor
  constructor(private readonly templatePacker: TemplatePacker) {}

  /**
   * Check if request should be handled by simulator
   */
  static shouldHandleRequest(req: Request, webpackResources?: string[]): boolean {
    // Skip static assets (images, fonts, webpack resources)
    if (RequestExtractor.isStaticAsset(req.path, webpackResources)) {
      return false
    }

    // Skip webpack dev server specific paths
    if (req.path.includes('/__webpack') || 
        req.path.includes('/sockjs-node') ||
        req.path.includes('.hot-update.') ||
        req.path.startsWith('/__') ||
        req.path === '/ws') {
      return false
    }

    // Skip websocket upgrades
    if (req.headers.upgrade === 'websocket') {
      return false
    }

    // Handle private files
    if (RequestExtractor.isPrivateFile(req)) {
      return true
    }

    // Handle all other requests (including favicon)
    return true
  }

  /**
   * Build simulator request payload from Express request
   * Captures raw HTTP body for v3 simulator to handle exactly like Ruby proxy
   */
  async buildSimulatorPayload(req: Request, templatePath?: string): Promise<SimulatorRequestData> {
    // Extract metadata from request
    const metadata = RequestExtractor.extractMetadata(req)

    // Pack templates
    const compressedTemplates = await this.templatePacker.getCompressedTemplates(templatePath)

    // Prepare headers with rack environment variables that Ruby expects
    const headers = this.prepareRackHeaders(metadata)

    // Capture raw HTTP body for v3 simulator
    const rawBody = this.captureRawBody(req)

    // Sanitize components for JSON serialization
    const sanitizedParams = this.sanitizeParams(metadata.params)
    const sanitizedQuery = this.sanitizeForJSON(metadata.query)
    const sanitizedHeaders = this.sanitizeForJSON(headers)

    // Serialize components
    const serializedBody = metadata.body ? JSON.stringify(this.sanitizeForJSON(metadata.body)) : undefined
    const serializedHeaders = JSON.stringify(sanitizedHeaders)
    const serializedQuery = JSON.stringify(sanitizedQuery)

    // Build the simulator request structure
    return {
      simulator: {
        code: compressedTemplates,
        method: metadata.method,
        path: metadata.path,
        request: {
          body: serializedBody,
          headers: serializedHeaders,
          host: metadata.host,
          method: metadata.method,
          params: sanitizedParams,
          port: metadata.port,
          query: serializedQuery,
          rawBody,
        },
        version: 'v3',
      },
    }
  }

  /**
   * Prepare headers with rack environment variables that Ruby server expects
   * For v3, we skip form variables since we send raw body instead
   */
  private prepareRackHeaders(metadata: RequestMetadata): Record<string, string | string[]> {
    const headers = { ...metadata.headers }

    // For v3, we don't send form_vars and form_hash since server will parse raw body
    // This avoids the "Cannot convert object to primitive value" error

    // Ensure cookies are properly mapped to HTTP_COOKIE for rack environment
    if (headers.cookie && !headers.HTTP_COOKIE) {
      headers.HTTP_COOKIE = headers.cookie
    }

    return headers
  }


  /**
   * Capture raw HTTP body from request and base64 encode it for JSON transport
   * For v3, we send the exact raw body as received, letting the server parse it
   */
  private captureRawBody(req: Request): string | undefined {
    // Check if we have raw body data attached to the request
    const rawBody = (req as any).rawBody
    if (rawBody && Buffer.isBuffer(rawBody)) {
      // Base64 encode the raw body for JSON transport
      return rawBody.toString('base64')
    }
    return undefined
  }


  /**
   * Sanitize any object for JSON serialization
   * Remove circular references and non-serializable objects
   */
  private sanitizeForJSON(obj: any): any {
    const seen = new WeakSet()

    const sanitize = (value: any): any => {
      if (value === null || value === undefined) {
        return value
      }

      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value
      }

      if (value instanceof Date) {
        return value.toISOString()
      }

      if (typeof value === 'function') {
        return '[Function]'
      }

      if (typeof value === 'object') {
        if (seen.has(value)) {
          return '[Circular]'
        }

        seen.add(value)

        if (Array.isArray(value)) {
          return value.map((item) => sanitize(item))
        }

        const result: any = {}
        for (const [key, val] of Object.entries(value)) {
          try {
            result[key] = sanitize(val)
          } catch {
            console.warn(`Skipping key ${key} due to serialization error`)
            result[key] = '[Unserializable]'
          }
        }

        seen.delete(value)
        return result
      }

      // For anything else, try to convert to string
      try {
        return String(value)
      } catch {
        return '[Unserializable]'
      }
    }

    return sanitize(obj)
  }

  /**
   * Sanitize parameters to avoid primitive conversion errors
   * Remove any objects that can't be converted to primitives
   */
  private sanitizeParams(params: Record<string, any>): Record<string, any> {
    return this.sanitizeForJSON(params)
  }

}
