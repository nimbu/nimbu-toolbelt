// Import core-js/stable unconditionally because we want to have an equal
// baseline and it is pretty small (especially because babel will transform it
// to only include what is needed for our target browsers)
import 'core-js/stable'
import 'regenerator-runtime/runtime'

export function loadScript(src, resolve, reject) {
  let js = document.createElement('script')
  js.src = src
  js.onload = function() {
    resolve()
  }
  js.onerror = function() {
    reject(new Error('Failed to load script ' + src))
  }
  document.head.appendChild(js)
}

export default function loadPolyfills() {
  const fillFetch = () =>
    new Promise((resolve, reject) => {
      if ('fetch' in window) {
        return resolve()
      } else {
        loadScript('//cdn.nimbu.io/js/polyfills/fetch-2.0.3.min.js', resolve, reject)
      }
    })

  return Promise.all([fillFetch()])
}
