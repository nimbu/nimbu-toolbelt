import { paths } from '@nimbu-cli/command'
import path from 'node:path'

export function getThemeRoot(): string {
  return paths.NIMBU_DIRECTORY
}

export function resolveFromThemeRoot(...segments: string[]): string {
  return path.join(getThemeRoot(), ...segments)
}

export function resolveSnippetPath(filename = 'vite.liquid'): string {
  return resolveFromThemeRoot('snippets', filename)
}

export function normalizePath(filePath: string, root: string): string {
  const relative = path.relative(root, filePath)
  return relative.split(path.sep).join('/')
}
