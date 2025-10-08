declare module 'object-treeify' {
  interface TreeifyOptions {
    keyLength?: number
    spacerNeighbour?: string
    spacerNoNeighbour?: string
    valueLength?: number
  }

  function treeify(
    object: Record<string, unknown>,
    options?: TreeifyOptions,
  ): string

  export default treeify
}
