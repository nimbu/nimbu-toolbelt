import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import { basename } from 'path'
import glob from 'glob'

const TIMEOUT = 10000

const promiseGlob = function (pattern: string, options: glob.IOptions = {}): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, files) => (err === null ? resolve(files) : reject(err)))
  })
}

export async function findMatchingFiles(dir: string, pattern: string): Promise<string[]> {
  return promiseGlob(`${dir}/${pattern}`)
}

export function download(url, path, callback) {
  return new Promise<void>(function (resolve, reject) {
    const uri = new URL(url)
    if (!path) {
      path = basename(uri.pathname!)
    }
    const file = fs.createWriteStream(path)
    const client = url.indexOf('https://') !== -1 ? https : http
    const request = client.get(uri.href!).on('response', function (res) {
      const len = parseInt(res.headers['content-length'] || '0', 10)
      let bytes = 0
      let percent = 0
      res
        .on('data', function (chunk) {
          file.write(chunk)
          bytes += chunk.length
          percent = parseFloat(((bytes * 100.0) / len).toFixed(2))
          if (callback !== undefined && callback instanceof Function) {
            callback(bytes, percent)
          }
        })
        .on('end', function () {
          file.end()
          resolve()
        })
        .on('error', function (err) {
          reject(err)
        })
    })
    request.setTimeout(TIMEOUT, function () {
      request.abort()
      reject(new Error(`request timeout after ${TIMEOUT / 1000.0}s`))
    })
  })
}

export function generateRandom(length) {
  let result = ''
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}
