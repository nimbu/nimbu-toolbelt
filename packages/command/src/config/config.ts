import * as path from 'node:path'

import * as paths from './paths'

const defaultConfig = {
  CDN_ROOT: '../',
  REACT: false,
}
let projectConfigPath: null | string = null

try {
  const projectPackageJson = require(path.resolve(paths.PROJECT_DIRECTORY, 'package.json'))
  projectConfigPath =
    projectPackageJson.nimbu && projectPackageJson.nimbu.config
      ? path.resolve(paths.PROJECT_DIRECTORY, projectPackageJson.nimbu.config)
      : path.resolve(paths.PROJECT_DIRECTORY, 'nimbu.js')
} catch {
  // do nothing, we are probably running the nimbu command in global context, i.e. to initialize a project
}

let projectConfig: { [key: string]: string } = {}
let config = defaultConfig

export async function initialize() {
  try {
    if (projectConfigPath != null) {
      projectConfig = require(projectConfigPath)
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code !== 'MODULE_NOT_FOUND') {
      throw error
    }
  }

  const prC = await Promise.resolve(projectConfig)
  config = { ...defaultConfig, ...prC }
  return config
}

export function get() {
  return config
}
