import { Request } from 'express'

import { FileProcessor } from './file-processor'
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

    // Handle private files
    if (RequestExtractor.isPrivateFile(req)) {
      return true
    }

    // Handle all other requests (including favicon)
    return true
  }

  /**
   * Build simulator request payload from Express request
   * Mirrors the Ruby logic for building simulator requests
   */
  async buildSimulatorPayload(req: Request, templatePath?: string): Promise<SimulatorRequestData> {
    // Extract metadata from request
    const metadata = RequestExtractor.extractMetadata(req)

    // Pack templates
    const compressedTemplates = await this.templatePacker.getCompressedTemplates(templatePath)

    // Process files if multipart data
    let files: Record<string, string> | undefined
    if (FileProcessor.hasMultipartData(req)) {
      const processedData = FileProcessor.processMultipartData(req.body)
      files = this.extractFiles(processedData)
    }

    // Prepare headers with rack environment variables that Ruby expects
    const headers = this.prepareRackHeaders(metadata)

    // Build the simulator request structure
    const simulatorRequest: SimulatorRequestData = {
      simulator: {
        code: compressedTemplates,
        method: metadata.method,
        path: metadata.path,
        request: {
          body: metadata.body ? JSON.stringify(metadata.body) : undefined,
          headers: JSON.stringify(headers),
          host: metadata.host,
          method: metadata.method,
          params: metadata.params,
          port: metadata.port,
          query: JSON.stringify(metadata.query),
        },
        version: 'v2',
      },
    }

    // Only add files property if there are files
    if (files) {
      simulatorRequest.simulator.files = files
    }

    return simulatorRequest
  }

  /**
   * Prepare headers with rack environment variables that Ruby server expects
   * This includes form variables and form hash for parameter handling
   */
  private prepareRackHeaders(metadata: RequestMetadata): Record<string, string | string[]> {
    const headers = { ...metadata.headers }

    // Convert parameters to form-encoded string for rack.request.form_vars
    const formVars = this.encodeFormVars(metadata.params)
    if (formVars) {
      headers['rack.request.form_vars'] = formVars
      headers['rack.request.form_hash'] = JSON.stringify(metadata.params)
    }

    // Ensure cookies are properly mapped to HTTP_COOKIE for rack environment
    if (headers.cookie && !headers.HTTP_COOKIE) {
      headers.HTTP_COOKIE = headers.cookie
    }

    return headers
  }

  /**
   * Encode parameters as form-encoded string (application/x-www-form-urlencoded)
   * This is what Ruby expects in rack.request.form_vars
   */
  private encodeFormVars(params: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return ''
    }

    const pairs: string[] = []
    
    const encodeValue = (key: string, value: any) => {
      if (value === null || value === undefined) {
        return
      }
      
      if (Array.isArray(value)) {
        for (const [index, item] of value.entries()) {
          encodeValue(`${key}[${index}]`, item)
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const [subKey, subValue] of Object.entries(value)) {
          encodeValue(`${key}[${subKey}]`, subValue)
        }
      } else {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      }
    }

    for (const [key, value] of Object.entries(params)) {
      encodeValue(key, value)
    }

    return pairs.join('&')
  }

  /**
   * Extract files from processed multipart data
   */
  private extractFiles(data: any): Record<string, string> | undefined {
    const files: Record<string, string> = {}
    let hasFiles = false

    const extractFilesRecursive = (obj: any, prefix = '') => {
      if (Array.isArray(obj)) {
        for (const [index, item] of obj.entries()) {
          extractFilesRecursive(item, `${prefix}[${index}]`)
        }
      } else if (obj && typeof obj === 'object') {
        if (obj.__type === 'file') {
          files[prefix || 'file'] = obj.data
          hasFiles = true
        } else {
          for (const [key, value] of Object.entries(obj)) {
            const newPrefix = prefix ? `${prefix}[${key}]` : key
            extractFilesRecursive(value, newPrefix)
          }
        }
      }
    }

    extractFilesRecursive(data)
    return hasFiles ? files : undefined
  }

}
