import { paths } from '@nimbu-cli/command'
import * as path from 'path'

const toolbeltDirectory = path.resolve(__dirname, '../..')

export const { NIMBU_DIRECTORY, PROJECT_DIRECTORY } = paths
export const GEMFILE = path.resolve(toolbeltDirectory, 'Gemfile')
