export interface EntryPoint {
  absolutePath: string
  name: string
  relativePath: string
}

export interface SnippetData {
  assets: string[]
  buildTimestamp: string
  chunks: string[]
  css: Record<string, string[]>
  entries: string[]
  js: Record<string, string>
}

export interface DevSnippetOptions {
  devBaseUrl: string
  entryPoints: EntryPoint[]
}

export interface ManifestSnippetOptions {
  entryPoints: EntryPoint[]
  manifestPath: string
}
