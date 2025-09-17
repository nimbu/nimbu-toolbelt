# Repository Guidelines

## Project Overview

Nimbu Toolbelt is a TypeScript/Node.js CLI for developing and managing Nimbu CMS projects. The monorepo uses pnpm workspaces plus Lerna to coordinate multiple packages, optional webpack plugins, and a bundled proxy server that power theme development and deployment. The architecture pairs a Node-based CLI (via oclif) that talks directly to Nimbu APIs with webpack-driven theme tooling for Liquid layouts.

## Project Structure & Architecture

All publishable workspaces live in `packages/*`. `packages/cli` hosts the oclif-based CLI (40+ commands spanning auth, themes, sites, channels, apps, notifications, and more). `packages/command` supplies the shared command base, API helpers, and output utilities. `packages/proxy-server` exposes an Express-based proxy for local development. `packages/webpack-v4` and `packages/webpack-v5` deliver optional bundlers loaded via `lib/hooks/optional-plugins`; v5 is the default modern stack while v4 remains for legacy themes. TypeScript sources stay under each package’s `src/`, compiled output in `lib/`, and tests colocated in `test/`. Update supporting docs in `docs/` whenever command behavior changes.

## Technology Stack

Webpack 5 (and 4 for legacy themes), Babel, CoffeeScript 2, SCSS/PostCSS, autoprefixer, and React tooling drive the theme pipeline. Development builds inject CSS via `style-loader` for HMR, while production extracts `stylesheets/app.css`; use `EXTRACT_CSS=true pnpm exec nimbu server` to force extraction during debugging. The build emits `snippets/webpack.liquid`, exposing `webpack_chunks`, `webpack_js`, and `webpack_css` for cache-aware asset loading—for example:

```liquid
{% include 'webpack' %}
{% for chunk in webpack_chunks %}
  {% for file in webpack_css[chunk] %}{{ file | stylesheet_tag }}{% endfor %}
  {{ webpack_js[chunk] | javascript_tag }}
{% endfor %}
```

Core dependencies include `@oclif/core`, `@nimbu-cli/command`, `nimbu-client`, Express middleware, and the optional webpack plugins. Key configuration lives in files such as `packages/webpack-v5/src/config/paths.ts`. Quality tooling relies on ESLint (oclif + Prettier configs), Prettier (`singleQuote`, `semi: false`, `trailingComma: all`), nyc for coverage, Mocha + Chai + @oclif/test, Nock for HTTP mocking, and Mock-FS/unionfs for filesystem scenarios.

## Build, Test & Package Commands

Run `pnpm install` once, then `pnpm run build` (alias for `lerna run build`) to compile every workspace. `pnpm run test`/`lerna run test --concurrency 4` execute the Mocha suites. Package publishing flows include `pnpm run alpha`, `pnpm run publish`, and `pnpm run yalc:publish`. Regenerate CLI metadata with `pnpm --filter nimbu exec oclif manifest`. Targeted tasks: `pnpm --filter nimbu run build`, `pnpm --filter nimbu run test`, `pnpm --filter nimbu run lint`, `pnpm --filter @nimbu-cli/proxy-server run build`, `pnpm --filter @nimbu-cli/plugin-webpack-v5 run build`, or `pnpm --filter @nimbu-cli/command run test`; you can also `cd packages/<name>` and run the same pnpm scripts directly. Remember—ALWAYS use pnpm for installs and scripts.

## Theme Development Workflow

1. `pnpm exec nimbu init` to scaffold with the desired theme.
2. `pnpm exec nimbu server` starts webpack-dev-server at http://localhost:4567 with HMR (set `EXTRACT_CSS=true` when you need extracted styles in dev).
3. `pnpm exec nimbu build` prepares production bundles.
4. `pnpm exec nimbu themes:push` deploys assets to Nimbu.  
   Ensure `snippets/webpack.liquid` stays committed so layouts can load generated chunks.

## Coding Style & Naming Conventions

Use 2-space indentation (`.editorconfig`), single quotes, no semicolons, trailing commas, and UTF-8 text. Follow oclif’s topic hierarchy (`src/commands/themes/push.ts` => `themes:push`). Prefer PascalCase for classes, camelCase for functions, and centralized exports via `src/utils`. Keep TypeScript definitions in `src/**/*.ts` and avoid deep relative imports when shared helpers exist.

## Testing & Quality Expectations

Name test files `*.test.ts` and place them alongside the code under `test/`. Leverage `@oclif/test` for CLI assertions, Nock for API stubs, Mock-FS/unionfs for filesystem cases, and fixture helpers in `packages/cli/test/helpers`. Run `pnpm run test` plus the affected workspace’s build before review; nyc configuration ensures coverage over CLI sources. Linting runs post-test in most packages—fix violations before submission.

## Common Workflows

**Adding a command:** Create a file in the appropriate `packages/cli/src/commands/<topic>/` folder, extend the base class from `@nimbu-cli/command`, declare flags/args/description, add tests, run `pnpm run build`, and verify with `./bin/run <command>`.  
**Modifying webpack config:** Update files in `packages/webpack-v5/src/config/` (notably `config/paths.ts`), test with `pnpm exec nimbu server`, confirm production output via `pnpm exec nimbu build`, and validate the Liquid snippet for new assets.  
**Proxy adjustments:** Use `packages/proxy-server` to debug network flows instead of touching production endpoints.

## Environment, Security & Configuration

Key environment variables include `NIMBU_API_KEY` and `NIMBU_SITE`; keep them in local `.env` files (already git-ignored). Never commit credentials or customer data—scrub fixtures before sharing. When debugging styles, use the proxy server or webpack options rather than editing live services. Optional plugins (`@nimbu-cli/plugin-webpack-v4` and `@nimbu-cli/plugin-webpack-v5`) register through the init hook; confirm their manifests with `pnpm --filter <plugin> run build` after changes.

## Commit & Pull Request Guidelines

Use short, imperative subjects; when applicable, add a conventional commit prefix (`fix:`, `feat:`, etc.) to align with Lerna’s `conventionalCommits` release flow. Describe intent, validation steps, and user impact in commit bodies or PR descriptions. Every PR should link related issues, mention documentation updates, and attach CLI output or screenshots for user-visible changes. State the results of `pnpm run build` and `pnpm run test` before requesting review.

Remember: always use PNPM
