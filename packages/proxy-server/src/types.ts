import { RequestHandler } from 'express'

export interface ProxyServerOptions {
  apiUrl?: string
  debug?: boolean
  host?: string
  nimbuClient: any
  port: number
  templatePath?: string
}

export interface RequestMetadata {
  body?: any
  headers: Record<string, string | string[]>
  host: string
  method: string
  params: Record<string, any>
  path: string
  port: number
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
