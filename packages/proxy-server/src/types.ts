import { RequestHandler } from 'express'

export interface ProxyServerOptions {
  apiUrl?: string
  host?: string
  nimbuClient: any
  port: number
  templatePath?: string
}

export interface RequestMetadata {
  body?: any
  headers: Record<string, string | string[]>
  method: string
  path: string
  query: Record<string, string | string[]>
}

export interface TemplateData {
  [templateType: string]: {
    [filename: string]: string
  }
}

export interface SimulatorPayload {
  files?: Record<string, string>
  metadata: RequestMetadata
  templates: TemplateData
}

export interface TemplateAdapter {
  packTemplates(templatePath: string): Promise<TemplateData>
}

export interface ServerAdapter {
  start(options?: ProxyServerOptions): Promise<void>
  stop(): Promise<void>
  use(middleware: RequestHandler): void
}