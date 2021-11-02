const paths = require('./paths')
const path = require('path')
const fs = require('fs')

let projectWebpackPath
const defaultWebpack = {
  customize: (defaultConfig, _) => defaultConfig,
}

try {
  const projectPackageJson = require(path.resolve(paths.PROJECT_DIRECTORY, 'package.json'))

  if (projectPackageJson.nimbu && projectPackageJson.nimbu.webpack) {
    projectWebpackPath = path.resolve(paths.PROJECT_DIRECTORY, projectPackageJson.nimbu.webpack)
  } else {
    projectWebpackPath = path.resolve(paths.PROJECT_DIRECTORY, 'webpack.js')
  }
} catch (_) {
  // do nothing, we are probably running the nimbu command in global context, i.e. to initialize a project
}

const projectWebpack = fs.existsSync(projectWebpackPath) ? require(projectWebpackPath) : {}

module.exports = Object.assign({}, defaultWebpack, projectWebpack)
