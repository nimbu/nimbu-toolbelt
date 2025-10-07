declare module 'vite' {
  export interface ServerConfig {
    host?: string | boolean
    port?: number
    strictPort?: boolean
    [key: string]: unknown
  }

  export interface RollupOutputOptions {
    entryFileNames?: string | ((chunk: unknown) => string)
    chunkFileNames?: string | ((chunk: unknown) => string)
    assetFileNames?: string | ((assetInfo: { name?: string }) => string)
    [key: string]: unknown
  }

  export interface BuildOptions {
    outDir?: string
    emptyOutDir?: boolean
    manifest?: boolean | string
    rollupOptions?: {
      input?: Record<string, string> | string | string[]
      output?: RollupOutputOptions
      [key: string]: unknown
    }
    [key: string]: unknown
  }

  export interface InlineConfig {
    cacheDir?: string
    envDir?: string
    mode?: string
    publicDir?: string | false
    root?: string
    server?: ServerConfig
    build?: BuildOptions
    [key: string]: unknown
  }

  export interface UserConfig extends InlineConfig {}

  export interface LoadConfigResult {
    path: string
    config: UserConfig
  }

  export interface ViteDevServer {
    close(): Promise<void>
    listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>
    printUrls(): void
    [key: string]: unknown
  }

  export function createServer(config: InlineConfig): Promise<ViteDevServer>
  export function mergeConfig<T extends InlineConfig, U extends InlineConfig>(base: T, overrides: U): T & U
  export function loadConfigFromFile(
    env: { command: 'build' | 'serve'; mode: string },
    configFile?: string,
    root?: string,
  ): Promise<LoadConfigResult | null>
  export function build(config: InlineConfig): Promise<unknown>
}
