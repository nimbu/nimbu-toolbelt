/* eslint-disable import/namespace */
import debugGlobal from 'debug'
import { http, https } from 'follow-redirects'
import * as fs from 'fs-extra'
import { glob } from 'glob-gitignore'
import ignore from 'ignore'
import { basename } from 'node:path'
const debug = debugGlobal('nimbu')

const TIMEOUT = 10_000

const promiseGlob = function (pattern: string, options: any = {}): Promise<string[]> {
  return glob(pattern, options)
}

export async function findMatchingFiles(dir: string, pattern: string): Promise<string[]> {
  debug('Looking for files in %s matching %s', dir, pattern)
  return promiseGlob(`${dir}/${pattern}`).then((files) => {
    const filenameOfIgnoreFile = `${dir}/.nimbuignore`
    if (fs.existsSync(filenameOfIgnoreFile)) {
      debug('Found .nimbuignore file, using it to filter files.')
      const ignoreObj = ignore().add(fs.readFileSync(filenameOfIgnoreFile).toString())
      return files.filter((file) => !ignoreObj.ignores(file.replace(`${dir}/`, '')))
    }

    return files
  })
}

export function download(
  url,
  path,
  callback,
  _debug = (msg: string) => {
    console.log(msg)
  },
) {
  return new Promise<void>((resolve, reject) => {
    const uri = new URL(url)
    if (!path) {
      path = basename(uri.pathname)
    }

    const file = fs.createWriteStream(path)
    const client = url.includes('https://') ? https : http
    const request = client.get(uri.href).on('response', (res) => {
      const len = Number.parseInt(res.headers['content-length'] || '0', 10)
      let bytes = 0
      let percent = 0
      res
        .on('data', (chunk) => {
          file.write(chunk)
          bytes += chunk.length
          percent = Number.parseFloat(((bytes * 100) / len).toFixed(2))
          if (callback !== undefined && callback instanceof Function) {
            callback(bytes, percent)
          }
        })
        .on('end', () => {
          file.end()
          resolve()
        })
        .on('error', (err) => {
          reject(err)
        })
    })
    request.setTimeout(TIMEOUT, () => {
      request.abort()
      reject(new Error(`request timeout after ${TIMEOUT / 1000}s`))
    })
  })
}

export function generateRandom(length) {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }

  return result
}
