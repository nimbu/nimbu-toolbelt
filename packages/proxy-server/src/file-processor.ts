import { Request } from 'express'
import * as multer from 'multer'

export interface ProcessedFile {
  __type: 'file'
  data: string // base64 encoded
  filename: string
}

export class FileProcessor {
  
  /**
   * Create multer configuration for handling file uploads
   */
  static createMulterConfig(): multer.Options {
    return {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 10 // Max 10 files
      },
      storage: multer.memoryStorage()
    }
  }

  /**
   * Get raw multipart data as base64
   * Mirrors the Base64.encode64(request.env["rack.input"].read) from base.rb
   */
  static getRawMultipartData(_req: Request): null | string {
    // This would typically be handled at the Express middleware level
    // For now, we'll return null and handle file conversion through normal processing
    return null
  }

  /**
   * Check if request contains multipart/file upload data
   * Mirrors the request.env["rack.tempfiles"] check from base.rb
   */
  static hasMultipartData(req: Request): boolean {
    return req.is('multipart/form-data') !== false
  }

  /**
   * Process multipart data and convert files to base64
   * Mirrors convert_tempfiles from base.rb
   */
  static processMultipartData(data: any): any {
    return this.convertValue(data)
  }

  /**
   * Convert file object to base64 format
   * Mirrors the file conversion logic from base.rb
   */
  private static convertFileToBase64(file: any): ProcessedFile {
    let buffer: Buffer
    let filename: string

    // Handle different file object formats
    if (file.buffer) {
      buffer = file.buffer
      filename = file.originalname || file.filename || 'uploaded_file'
    } else if (file.data) {
      buffer = file.data
      filename = file.name || file.filename || 'uploaded_file'
    } else {
      throw new Error('Unknown file object format')
    }

    return {
      __type: 'file',
      data: buffer.toString('base64'),
      filename
    }
  }

  /**
   * Convert a single value, handling files, arrays, and objects
   * Mirrors convert_single_value from base.rb
   */
  private static convertValue(value: any): any {
    if (Array.isArray(value)) {
      return value.map(item => this.convertValue(item))
    }
    
    if (value && typeof value === 'object') {
      // Check if it's a file object (from multer or similar)
      if (this.isFileObject(value)) {
        return this.convertFileToBase64(value)
      }
      
      // Process object properties recursively
      const result: any = {}
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.convertValue(val)
      }

      return result
    }
    
    return value
  }

  /**
   * Check if object is a file upload
   */
  private static isFileObject(obj: any): boolean {
    return obj && (
      // Multer file object
      (obj.fieldname && obj.originalname && obj.buffer) ||
      // Express-fileupload object
      (obj.name && obj.data) ||
      // Raw file buffer with metadata
      (obj.filename && (obj.buffer || obj.data))
    )
  }
}