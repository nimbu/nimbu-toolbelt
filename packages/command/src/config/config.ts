import * as paths from './paths'
import * as path from 'path'

const defaultConfig = {
  CDN_ROOT: '../',
  REACT: false,
}
let projectConfigPath: any

try {
  const projectPackageJson = require(path.resolve(paths.PROJECT_DIRECTORY, 'package.json'))
  if (projectPackageJson.nimbu && projectPackageJson.nimbu.config) {
    projectConfigPath = path.resolve(paths.PROJECT_DIRECTORY, projectPackageJson.nimbu.config)
  } else {
    projectConfigPath = path.resolve(paths.PROJECT_DIRECTORY, 'nimbu.js')
  }
} catch {
  // do nothing, we are probably running the nimbu command in global context, i.e. to initialize a project
}

let projectConfig: any = {}
let config = defaultConfig

export async function initialize() {
  try {
    if (projectConfigPath != null) {
      projectConfig = require(projectConfigPath)
    }
  } catch (error) {
    if ((error as any).code !== 'MODULE_NOT_FOUND') {
      throw error
    }
  }

  const prC = await Promise.resolve(projectConfig)
  config = Object.assign({}, defaultConfig, prC)
  return config
}

export function get() {
  return config
}
