import { paths } from '@nimbu-cli/command'
import * as fs from 'node:fs'
import * as path from 'node:path'

const toolbeltDirectory = path.resolve(__dirname, '../..')

export const { NIMBU_DIRECTORY, PROJECT_DIRECTORY } = paths
export const GEMFILE = path.resolve(toolbeltDirectory, 'Gemfile')
export const yarnLockFile = path.resolve(PROJECT_DIRECTORY, 'yarn.lock')
export const pnpmLockFile = path.resolve(PROJECT_DIRECTORY, 'pnpm-lock.yaml')

export const packageManager = fs.existsSync(pnpmLockFile)
  ? 'pnpm'
  : fs.existsSync(yarnLockFile)
    ? 'yarn'
    : 'npm'
