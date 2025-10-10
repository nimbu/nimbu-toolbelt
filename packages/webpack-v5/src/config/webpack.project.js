const fs = require('node:fs')
const path = require('node:path')

const paths = require('./paths')

let projectWebpackPath
const defaultWebpack = {
  customize: (defaultConfig, _) => defaultConfig,
}

try {
  const projectPackageJson = require(path.resolve(paths.PROJECT_DIRECTORY, 'package.json'))

  projectWebpackPath =
    projectPackageJson.nimbu && projectPackageJson.nimbu.webpack
      ? path.resolve(paths.PROJECT_DIRECTORY, projectPackageJson.nimbu.webpack)
      : path.resolve(paths.PROJECT_DIRECTORY, 'webpack.js')
} catch {
  // do nothing, we are probably running the nimbu command in global context, i.e. to initialize a project
}

const projectWebpack = fs.existsSync(projectWebpackPath) ? require(projectWebpackPath) : {}

module.exports = { ...defaultWebpack, ...projectWebpack }
