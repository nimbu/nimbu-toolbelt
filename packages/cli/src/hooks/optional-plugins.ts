import { Hook, Plugin } from '@oclif/core'
import debug from 'debug'
import path from 'node:path'

const optionals: Record<string, false | string> = {}

function resolveOptional(moduleName: string) {
  try {
    optionals[moduleName] = require.resolve(`${moduleName}/package.json`)
  } catch {
    try {
      optionals[moduleName] = require.resolve(moduleName)
    } catch {
      optionals[moduleName] = false
    }
  }
}

function getOptional(moduleName: string) {
  if (optionals[moduleName] == null) {
    resolveOptional(moduleName)
  }

  return optionals[moduleName]
}

function hasOptional(moduleName: string) {
  return getOptional(moduleName) !== false
}

const hook: Hook<'init'> = async function (options) {
  const log = debug('nimbu')

  // do not load optional plugins while testing
  if (process.env.NODE_ENV === 'test') return

  // use any as the optionalPlugins key is something we added and not in the interface
  const oclifConfig = options.config.pjson.oclif as any
  const configuredPlugins: string[] = oclifConfig.optionalPlugins ?? []

  for (const plugin of configuredPlugins) {
    if (!hasOptional(plugin)) continue

    log(`Loading ${plugin}...`)

    const resolved = getOptional(plugin)
    const pluginRoot = typeof resolved === 'string' ? path.dirname(resolved) : options.config.root

    const instance = new Plugin({ name: plugin, root: pluginRoot, type: 'user' })
    await instance.load()

    const pluginsCollection: any = options.config.plugins
    const hasPlugin =
      typeof pluginsCollection?.has === 'function'
        ? pluginsCollection.has(instance.name)
        : Boolean(pluginsCollection?.[instance.name])

    if (hasPlugin) continue

    if (typeof pluginsCollection?.set === 'function') {
      pluginsCollection.set(instance.name, instance)
    } else {
      pluginsCollection[instance.name] = instance
    }

    // @ts-ignore: yes, we are deliberately using a private method here...
    options.config.loadCommands(instance)

    // @ts-ignore: this too
    options.config.loadTopics(instance)
  }
}

export default hook
