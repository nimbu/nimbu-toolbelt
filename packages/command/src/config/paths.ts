import * as fs from 'fs'
import * as path from 'path'

const projectDirectory = fs.realpathSync(process.cwd())
const toolbeltDirectory = path.resolve(__dirname, '../..')
const nimbuDirectory =
  process.env.NIMBU_DIRECTORY != null ? path.resolve(process.env.NIMBU_DIRECTORY) : projectDirectory

export const NIMBU_DIRECTORY = nimbuDirectory
export const PROJECT_DIRECTORY = projectDirectory
export const TOOLBELT_DIRECTORY = toolbeltDirectory
