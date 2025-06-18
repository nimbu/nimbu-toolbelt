import { Request } from 'express'

import { FileProcessor } from './file-processor'
import { RequestExtractor } from './request-extractor'
import { TemplatePacker } from './template-packer'

export interface SimulatorRequestData {
  simulator: {
    code: string
    files?: Record<string, string>
    multipart?: string
    path: string
    request: {
      body?: string
      headers: string
      method: string
      query: string
    }
    session: string
    version: string
  }
}

export class SimulatorFormatter {
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
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

    // Build the simulator request structure
    const simulatorRequest: SimulatorRequestData = {
      simulator: {
        code: compressedTemplates,
        path: metadata.path,
        request: {
          body: metadata.body ? JSON.stringify(metadata.body) : undefined,
          headers: JSON.stringify(metadata.headers),
          method: metadata.method,
          query: JSON.stringify(metadata.query),
        },
        session: JSON.stringify({}), // Empty session for now
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

  /**
   * Get version string for simulator
   */
  private getVersion(): string {
    return process.env.npm_package_version || '1.0.0'
  }
}
