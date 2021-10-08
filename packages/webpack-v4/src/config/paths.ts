import { paths } from '@nimbu-cli/command'
import * as path from 'path'

export const { NIMBU_DIRECTORY, PROJECT_DIRECTORY, TOOLBELT_DIRECTORY } = paths
export const GEMFILE = path.resolve(paths.TOOLBELT_DIRECTORY, 'Gemfile')
