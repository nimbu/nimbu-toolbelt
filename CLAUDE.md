# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nimbu Toolbelt** is a comprehensive CLI tool for developing and managing projects on the Nimbu CMS platform. It's a monorepo built with TypeScript, Node.js, and uses Lerna for package management. The tool provides both modern webpack-based development tooling and Ruby gem integration for theme development and deployment.

## Development Commands

### Build and Test
- `yarn build` - Build all packages using Lerna
- `yarn test` - Run all tests across packages (concurrency: 4)
- `lerna run build` - Build individual packages
- `lerna run test --concurrency 4` - Run tests for all packages

### Package Management
- `yarn alpha` - Build and publish alpha/pre-release versions
- `yarn publish` - Build and publish stable versions  
- `yarn yalc:publish` - Publish packages locally for testing with yalc

### Individual Package Development
- `cd packages/cli && yarn build` - Build CLI package
- `cd packages/cli && yarn test` - Test CLI package
- `cd packages/cli && yarn lint` - Lint CLI package
- `cd packages/webpack-v5 && yarn build` - Build webpack plugin
- `cd packages/command && yarn test` - Test base command library

### Theme Development Workflow
- `yarn nimbu init` - Initialize project with theme selection
- `yarn nimbu server` - Start development server (webpack-dev-server + ruby server at localhost:4567)
- `yarn nimbu build` - Create production build
- `yarn nimbu themes:push` - Deploy theme to Nimbu platform

## Architecture

### Monorepo Structure
The project uses **Lerna + Yarn workspaces** with three core packages:

#### packages/cli
- Main CLI entry point built on **OCLIF framework**
- 40+ commands organized by topic (auth, themes, sites, channels, etc.)
- Plugin system with optional webpack plugins loaded dynamically
- Commands include: `auth:login`, `init`, `server`, `build`, `themes:pull/push`, `channels:copy`, etc.

#### packages/command  
- Base command infrastructure extending OCLIF
- Shared utilities: Nimbu API client wrapper, authentication, configuration management
- Color utilities and helpers for consistent CLI output

#### packages/webpack-v5
- Modern webpack-based build system for theme development
- Features: HMR, TypeScript/CoffeeScript support, SCSS pipeline, asset optimization
- Ruby gem integration via `bundle exec nimbu` commands
- Generates `snippets/webpack.liquid` for Liquid template integration

### Hybrid Architecture Pattern
The toolbelt bridges **modern frontend development** with **legacy Ruby gem compatibility**:
- Node.js CLI with TypeScript for modern development experience
- Ruby gem backend (`bundle exec nimbu`) for Nimbu platform operations
- Webpack frontend with Liquid template integration for asset pipeline

## Technology Stack

### Frontend Build Pipeline
- **Webpack 5**: Module bundling with HMR and optimization
- **Babel**: ES6+ transpilation with React JSX support
- **SCSS/PostCSS**: Sass preprocessing with autoprefixer
- **TypeScript**: Optional TS support (enable with `yarn add --dev typescript ts-loader`)
- **CoffeeScript**: Legacy CoffeeScript 2 support

### Ruby Integration
- **Bundler**: Ruby dependency management via Gemfile in webpack-v5 package
- **Nimbu Gem**: Legacy Ruby-based theme operations
- Process spawning via `spawn('bundle', ['exec', 'nimbu', ...])` pattern

### Testing & Quality
- **Mocha + Chai**: Test framework with TypeScript support
- **ESLint**: Linting with OCLIF and Prettier configurations
- **Nock**: HTTP mocking for API tests
- **Mock-FS**: File system mocking

## Key Files and Patterns

### Configuration
- `/packages/webpack-v5/src/config/paths.ts` - Path configuration
- `/packages/webpack-v5/src/nimbu-gem/process.ts` - Ruby gem process spawning
- Each package has its own `package.json` with specific scripts

### Command Structure
- Commands follow OCLIF patterns with base classes from `@nimbu-cli/command`
- Commands organized by topic using colon separator (e.g., `themes:push`)
- Optional plugins system for webpack versions

### Asset Pipeline Integration
- Development: CSS injected via `style-loader` for HMR
- Production: CSS extracted to `stylesheets/app.css`
- Generates `snippets/webpack.liquid` with build metadata for Liquid templates
- Support for cache-busting and chunk information

## Development Notes

### Ruby Dependencies
The webpack-v5 package includes a `postinstall` script that runs `bundle install`. Ensure Ruby and Bundler are available in the development environment.

### Environment Variables
- `EXTRACT_CSS=true yarn nimbu server` - Force CSS extraction in development
- `NIMBU_API_KEY` - Set by CLI for Ruby gem authentication
- `NIMBU_SITE` - Site context for operations

### Plugin System
CLI supports optional webpack plugins:
- `@nimbu-cli/plugin-webpack-v4` (legacy)
- `@nimbu-cli/plugin-webpack-v5` (current)

Plugins are loaded dynamically via hooks in `lib/hooks/optional-plugins`.

### Liquid Template Integration
The build process generates webpack metadata for Liquid templates:
```liquid
{% include 'webpack' %}
{% for chunk in webpack_chunks %}{{ webpack_js[chunk] | javascript_tag }}{% endfor %}
```

## Common Workflows

### Adding New Commands
1. Create TypeScript file in appropriate `packages/cli/src/commands/` subdirectory
2. Extend base command from `@nimbu-cli/command`
3. Follow OCLIF command patterns with flags, args, and description
4. Add tests in corresponding test directory
5. Run `yarn build` and test with `./bin/run <command>`

### Modifying Webpack Configuration  
1. Edit configuration files in `packages/webpack-v5/src/config/`
2. Test with theme project using `yarn nimbu server`
3. Verify both development and production builds work
4. Ensure `snippets/webpack.liquid` generation works correctly

### Working with Ruby Integration
1. Ruby operations are handled via `packages/webpack-v5/src/nimbu-gem/process.ts`
2. Environment variables are passed to Ruby processes for authentication
3. Ruby gem path is managed via `paths.GEMFILE` configuration

## Development Reminders
- Remember ALWAYS use yarn