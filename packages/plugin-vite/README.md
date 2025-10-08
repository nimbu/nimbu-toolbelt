# @nimbu-cli/plugin-vite

Vite-powered development and build tooling for Nimbu themes. The plugin mirrors the
existing webpack integration by generating `snippets/vite.liquid`, keeping asset
filenames stable, and routing the Nimbu proxy through the Node-based proxy server.

## Installation

```
pnpm add -D @nimbu-cli/plugin-vite
```

Make sure you only keep one bundler plugin installed at a time (either the
webpack plugin or this Vite plugin) to avoid command conflicts. The core CLI
loads optional plugins listed in `package.json#oclif.optionalPlugins` when the
package is present.

## Development

```
pnpm exec nimbu server --port 5173
```

- The proxy and Vite dev middleware share the same port (default `http://localhost:4567`).
- HMR traffic flows through the same origin, so no extra port management is required.
- The plugin rewrites `snippets/vite.liquid` so templates can keep using the
  aggregate snippet just like the webpack workflow.

## Production build

```
pnpm exec nimbu build
```

- Runs `vite build` with a stable Rollup output pattern.
- Copies generated assets into `javascripts/` and `stylesheets/` inside the
  theme directory without hashes.
- Writes an updated `snippets/vite.liquid` file based on the Vite manifest.

## Configuration

- Place your Vite config at the project root (e.g. `vite.config.ts`).
- If no config file is found, the plugin falls back to `src/index.(t|j)sx?` as
  the entry and writes assets to `.nimbu-vite/` before synchronising them into
  the theme directories.
- Custom Rollup inputs are supported; their keys become the chunk names exposed
  in Liquid.

## Snippet contract

The aggregate snippet exposes:

- `vite_build_timestamp`
- `vite_chunks`
- `vite_js`
- `vite_css`

Entries can be accessed directly off the aggregate maps; for example
`vite_js['app']` and `vite_css['app']` provide the specific asset references.
