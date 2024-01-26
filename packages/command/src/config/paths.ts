import * as fs from 'node:fs'
import * as path from 'node:path'

const projectDirectory = fs.realpathSync(process.cwd())
const toolbeltDirectory = path.resolve(__dirname, '../..')
const nimbuDirectory =
  process.env.NIMBU_DIRECTORY == null ? projectDirectory : path.resolve(process.env.NIMBU_DIRECTORY)

export const NIMBU_DIRECTORY = nimbuDirectory
export const PROJECT_DIRECTORY = projectDirectory
export const TOOLBELT_DIRECTORY = toolbeltDirectory
