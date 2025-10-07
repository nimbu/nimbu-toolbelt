export interface EntryPoint {
  name: string
  absolutePath: string
  relativePath: string
}

export interface SnippetData {
  buildTimestamp: string
  chunks: string[]
  entries: string[]
  js: Record<string, string>
  css: Record<string, string[]>
}

export interface DevSnippetOptions {
  entryPoints: EntryPoint[]
  devBaseUrl: string
}

export interface ManifestSnippetOptions {
  entryPoints: EntryPoint[]
  manifestPath: string
}
