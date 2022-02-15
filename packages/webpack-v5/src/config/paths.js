'use strict'

import { paths } from '@nimbu-cli/command'
import * as path from 'path'

const toolbeltDirectory = path.resolve(__dirname, '../..')

export const { NIMBU_DIRECTORY, PROJECT_DIRECTORY } = paths
export const GEMFILE = path.resolve(toolbeltDirectory, 'Gemfile')

const fs = require('fs')
const getPublicUrlOrPath = require('react-dev-utils/getPublicUrlOrPath')

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebook/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd())
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath)

// We use `PUBLIC_URL` environment variable or "homepage" field to infer
// "public path" at which the app is served.
// webpack needs to know it to put the right <script> hrefs into HTML even in
// single-page apps that may serve index.html for nested URLs like /todos/42.
// We can't use a relative path in HTML because we don't want to load something
// like /todos/42/static/js/bundle.7289d.js. We have to know the root.
export const publicUrlOrPath = getPublicUrlOrPath(
  process.env.NODE_ENV === 'development',
  require(resolveApp('package.json')).homepage,
  process.env.PUBLIC_URL,
)

const buildPath = process.env.BUILD_PATH || NIMBU_DIRECTORY

const moduleFileExtensions = [
  'web.mjs',
  'mjs',
  'web.js',
  'js',
  'web.ts',
  'ts',
  'web.tsx',
  'tsx',
  'json',
  'web.jsx',
  'jsx',
  'coffee',
]

// Resolve file paths in the same order as webpack
const resolveModule = (resolveFn, filePath) => {
  const extension = moduleFileExtensions.find((extension) => fs.existsSync(resolveFn(`${filePath}.${extension}`)))

  if (extension) {
    return resolveFn(`${filePath}.${extension}`)
  }

  return resolveFn(`${filePath}.js`)
}

export const dotenv = resolveApp('.env'),
export const appPath = resolveApp('.'),
export const appBuild = resolveApp(buildPath),
export const appPublic = resolveApp('public'),
export const appHtml = resolveApp('public/index.html'),
export const appIndexJs = resolveModule(resolveApp, 'src/index.js'),
export const appIndexScss = resolveModule(resolveApp, 'src/index.scss'),
export const appPackageJson = resolveApp('package.json'),
export const appSrc = resolveApp('src'),
export const appTsConfig = resolveApp('tsconfig.json'),
export const appJsConfig = resolveApp('jsconfig.json'),
export const yarnLockFile = resolveApp('yarn.lock'),
export const testsSetup = resolveModule(resolveApp, 'src/setupTests'),
export const proxySetup = resolveApp('src/setupProxy.js'),
export const appNodeModules = resolveApp('node_modules'),
export const appWebpackCache = resolveApp('node_modules/.cache'),
export const appTsBuildInfoFile = resolveApp('node_modules/.cache/tsconfig.tsbuildinfo'),
export const swSrc = resolveModule(resolveApp, 'src/service-worker'),

export const moduleFileExtensions = moduleFileExtensions
