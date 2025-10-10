const MIN_NODE_VERSION = { major: 20, minor: 19, patch: 0 }

function parseVersion(version: string) {
  const [major = '0', minor = '0', patch = '0'] = version.replace(/^v/, '').split('.')
  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
  }
}

function isAtLeast(target: typeof MIN_NODE_VERSION, current: typeof MIN_NODE_VERSION): boolean {
  if (current.major !== target.major) return current.major > target.major
  if (current.minor !== target.minor) return current.minor > target.minor
  return current.patch >= target.patch
}

export function ensureViteNodeCompatibility(): void {
  const current = parseVersion(process.versions.node)

  if (!Number.isFinite(current.major) || !Number.isFinite(current.minor) || !Number.isFinite(current.patch)) {
    return
  }

  if (!isAtLeast(MIN_NODE_VERSION, current)) {
    throw new Error(
      `Vite 7 requires Node.js >= ${MIN_NODE_VERSION.major}.${MIN_NODE_VERSION.minor}.${MIN_NODE_VERSION.patch}. ` +
        `Current version is ${process.versions.node}.`,
    )
  }
}
