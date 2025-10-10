const loaderUtils = require('loader-utils')
const { transform } = require('@svgr/core').default ?? require('@svgr/core')

const normalizePluginEntry = (entry) => {
  if (!entry) return []
  if (typeof entry === 'string') return [{ name: entry }]
  if (Array.isArray(entry)) return entry.flatMap(normalizePluginEntry)
  if (entry.name) return [entry]

  return Object.entries(entry).map(([name, value]) => {
    if (typeof value === 'boolean') {
      return { active: value, name }
    }

    return { name, params: value }
  })
}

const buildSvgoConfig = (loaderContext, content, pluginOpts) => {
  const defaultPlugins = [
    {
      name: 'cleanupIds',
      params: {
        minify: true,
        prefix: loaderUtils.interpolateName(loaderContext, '[hash]-', { content }),
        remove: true,
      },
    },
    {
      active: true,
      name: 'removeTitle',
    },
  ]

  const extraPlugins = normalizePluginEntry(pluginOpts).flat()

  return {
    plugins: [...defaultPlugins, ...extraPlugins],
  }
}

module.exports = function (content) {
  const loaderOptions = loaderUtils.getOptions(this) || {}
  const pluginOpts = loaderOptions.plugins ?? []
  const callback = this.async()

  const svgoConfig = buildSvgoConfig(this, content, pluginOpts)
  const jsxRuntime =
    loaderOptions.jsx === 'automatic' || loaderOptions.jsx === 'classic'
      ? loaderOptions.jsx
      : loaderOptions.jsx
        ? 'classic'
        : 'classic'

  Promise.resolve(String(content))
    .then((svg) =>
      transform(
        svg,
        {
          jsxRuntime,
          prettier: false,
          svgo: true,
          svgoConfig,
        },
        {
          componentName: loaderOptions.componentName,
          filePath: this.resourcePath,
        },
      ),
    )
    .then((result) => callback(null, result))
    .catch((error) => callback(error))
}
