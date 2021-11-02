const loaderUtils = require('loader-utils')
const rsvgCore = require('react-svg-core')

function svgoOpts(self, content, pluginOpts) {
  return {
    plugins: [
      {
        cleanupIDs: {
          minify: true,
          prefix: loaderUtils.interpolateName(self, '[hash]-', { content }),
          remove: true,
        },
      },
      {
        removeTitle: true,
      },
    ].concat(pluginOpts),
  }
}

module.exports = function (content) {
  const loaderOpts = loaderUtils.getOptions(this) || {}
  const pluginOpts = (loaderOpts != null ? loaderOpts.plugins : []) || []

  const cb = this.async()

  Promise.resolve(String(content))
    .then(rsvgCore.optimize(svgoOpts(this, content, pluginOpts)))
    .then(rsvgCore.transform({ jsx: loaderOpts.jsx }))
    .then((result) => cb(null, result.code))
    .catch((err) => cb(err))
}
