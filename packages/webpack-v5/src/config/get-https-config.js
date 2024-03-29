'use strict'

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const chalk = require('react-dev-utils/chalk')
const paths = require('./paths')

// Ensure the certificate and key provided are valid and if not
// throw an easy to debug error
function validateKeyAndCerts({ cert, crtFile, key, keyFile }) {
  let encrypted
  try {
    // publicEncrypt will throw an error with an invalid cert
    encrypted = crypto.publicEncrypt(cert, Buffer.from('test'))
  } catch (error) {
    throw new Error(`The certificate "${chalk.yellow(crtFile)}" is invalid.\n${error.message}`)
  }

  try {
    // privateDecrypt will throw an error with an invalid key
    crypto.privateDecrypt(key, encrypted)
  } catch (error) {
    throw new Error(`The certificate key "${chalk.yellow(keyFile)}" is invalid.\n${error.message}`)
  }
}

// Read file and throw an error if it doesn't exist
function readEnvFile(file, type) {
  if (!fs.existsSync(file)) {
    throw new Error(
      `You specified ${chalk.cyan(type)} in your env, but the file "${chalk.yellow(file)}" can't be found.`,
    )
  }

  return fs.readFileSync(file)
}

// Get the https config
// Return cert files if provided in env, otherwise just true or false
function getHttpsConfig() {
  const { HTTPS, SSL_CRT_FILE, SSL_KEY_FILE } = process.env
  const isHttps = HTTPS === 'true'

  if (isHttps && SSL_CRT_FILE && SSL_KEY_FILE) {
    const crtFile = path.resolve(paths.appPath, SSL_CRT_FILE)
    const keyFile = path.resolve(paths.appPath, SSL_KEY_FILE)
    const config = {
      cert: readEnvFile(crtFile, 'SSL_CRT_FILE'),
      key: readEnvFile(keyFile, 'SSL_KEY_FILE'),
    }

    validateKeyAndCerts({ ...config, crtFile, keyFile })
    return config
  }

  return isHttps
}

module.exports = getHttpsConfig
