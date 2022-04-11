import { Hook, Plugin } from '@oclif/core'
import Debug from 'debug'

const optionals = {}

function resolveOptional(moduleName) {
  try {
    optionals[moduleName] = require.resolve(moduleName)
  } catch (error) {
    optionals[moduleName] = false
  }
}

function getOptional(moduleName) {
  if (optionals[moduleName] == null) {
    resolveOptional(moduleName)
  }
  return optionals[moduleName]
}

function hasOptional(moduleName) {
  return getOptional(moduleName) !== false
}

const hook: Hook<'init'> = async function (options) {
  const debug = Debug('nimbu')

  // do not load optional plugins while testing
  if (process.env.NODE_ENV === 'test') return

  // use any as the optionalPlugins key is something we added and not in the interface
  const oclifConfig = options.config.pjson.oclif as any

  for (const plugin of oclifConfig.optionalPlugins) {
    if (hasOptional(plugin)) {
      debug(`Loading ${plugin}...`)
      // the optional plugin is present in this project, let's load it!

      const instance = new Plugin({ root: options.config.root, type: 'user', name: plugin })
      await instance.load()

      if (options.config.plugins.find((p) => p.name === instance.name)) return
      options.config.plugins.push(instance)

      //@ts-ignore: yes, we are deliberately using a private method here...
      options.config.loadCommands(instance)

      //@ts-ignore: this too
      options.config.loadTopics(instance)
    }
  }
}

export default hook
