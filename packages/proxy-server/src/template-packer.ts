import * as fs from 'node:fs'
import * as path from 'node:path'
import * as zlib from 'node:zlib'

import { TemplateAdapter, TemplateData } from './types'

export class TemplatePacker implements TemplateAdapter {
  constructor(private readonly projectRoot: string) {}

  /**
   * Get compressed template data as base64
   * Mirrors the compression logic from pack_templates!
   */
  async getCompressedTemplates(templatePath?: string): Promise<string> {
    const templates = await this.packTemplates(templatePath)
    const jsonString = JSON.stringify(templates)
    
    return new Promise((resolve, reject) => {
      zlib.deflate(jsonString, { level: zlib.constants.Z_DEFAULT_COMPRESSION }, (err, compressed) => {
        if (err) {
          reject(err)
        } else {
          resolve(compressed.toString('base64'))
        }
      })
    })
  }

  /**
   * Check if template file exists
   */
  hasTemplate(templatePath: string, type: string, name: string): boolean {
    const filePath = path.join(templatePath || this.projectRoot, type, name)
    return fs.existsSync(filePath) || fs.existsSync(filePath + '.liquid') || fs.existsSync(filePath + '.liquid.haml')
  }

  /**
   * Pack templates from layouts, templates, and snippets directories
   * Mirrors pack_templates! from base.rb
   */
  async packTemplates(templatePath?: string): Promise<TemplateData> {
    const templates: TemplateData = {}
    const rootPath = templatePath || this.projectRoot
    
    // Load templates from each directory type
    const templateTypes = ['layouts', 'templates', 'snippets']
    
    for (const type of templateTypes) {
      templates[type] = {}
      await this.loadFiles(rootPath, type, templates)
    }
    
    return templates
  }

  /**
   * Recursively find files with specific extensions
   */
  private findFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = []
    
    if (!fs.existsSync(dir)) {
      return files
    }
    
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory()) {
        files.push(...this.findFiles(fullPath, extensions))
      } else if (entry.isFile() && extensions.some(extension => entry.name.endsWith(extension))) {
        files.push(fullPath)
      }
    }
    
    return files
  }

  /**
   * Get file extension including compound extensions like .liquid.haml
   */
  private getFileExtension(filename: string): string {
    if (filename.endsWith('.liquid.haml')) {
      return '.liquid.haml'
    }

    return path.extname(filename)
  }

  /**
   * Load files from a specific template directory
   * Mirrors load_files from base.rb
   */
  private async loadFiles(rootPath: string, type: string, templates: TemplateData): Promise<void> {
    const typeDir = path.join(rootPath, type)
    
    if (!fs.existsSync(typeDir)) {
      return
    }
    
    if (!templates[type]) {
      templates[type] = {}
    }
    
    // Find all .liquid and .liquid.haml files recursively
    const liquidFiles = this.findFiles(typeDir, ['.liquid', '.liquid.haml'])
    
    for (const filePath of liquidFiles) {
      try {
        // Get relative path from type directory
        const relativePath = path.relative(typeDir, filePath)
        
        // Read file content and force UTF-8 encoding
        const content = fs.readFileSync(filePath, 'utf8')
        
        templates[type][relativePath] = content
      } catch (error) {
        console.error(`Error reading template file ${filePath}:`, error)
      }
    }
  }
}