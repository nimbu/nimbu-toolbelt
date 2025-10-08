declare module 'vite' {
  export interface ServerConfig {
    [key: string]: unknown
    host?: boolean | string
    port?: number
    strictPort?: boolean
  }

  export interface RollupOutputOptions {
    [key: string]: unknown
    assetFileNames?: ((assetInfo: { name?: string }) => string) | string
    chunkFileNames?: ((chunk: unknown) => string) | string
    entryFileNames?: ((chunk: unknown) => string) | string
  }

  export interface BuildOptions {
    [key: string]: unknown
    emptyOutDir?: boolean
    manifest?: boolean | string
    outDir?: string
    rollupOptions?: {
      [key: string]: unknown
      input?: Record<string, string> | string | string[]
      output?: RollupOutputOptions
    }
  }

  export interface InlineConfig {
    [key: string]: unknown
    build?: BuildOptions
    cacheDir?: string
    envDir?: string
    mode?: string
    publicDir?: false | string
    root?: string
    server?: ServerConfig
  }

  export type UserConfig = InlineConfig

  export interface LoadConfigResult {
    config: UserConfig
    path: string
  }

  export interface ViteDevServer {
    [key: string]: unknown
    close(): Promise<void>
    listen(port?: number, isRestart?: boolean): Promise<ViteDevServer>
    printUrls(): void
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
