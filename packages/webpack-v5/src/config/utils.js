const optionals = {}

export function resolveOptional(moduleName) {
  try {
    optionals[moduleName] = require.resolve(moduleName)
  } catch {
    optionals[moduleName] = false
  }
}

export function getOptional(moduleName) {
  if (optionals[moduleName] == null) {
    resolveOptional(moduleName)
  }

  return optionals[moduleName]
}

export function hasOptional(moduleName) {
  return getOptional(moduleName) !== false
}
