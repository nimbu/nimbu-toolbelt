# Nimbu CLI

[![Build Status](https://travis-ci.org/nimbu/nimbu-toolbelt.png?branch=master)](https://travis-ci.org/nimbu/nimbu-toolbelt)
[![codecov](https://codecov.io/gh/nimbu/nimbu-toolbelt/branch/master/graph/badge.svg)](https://codecov.io/gh/nimbu/nimbu-toolbelt)

Toolbelt for Nimbu projects

See [Repository Guidelines](./AGENTS.md) for contributor practices covering builds, testing, and review expectations.

[![Version](https://img.shields.io/npm/v/nimbu-toolbelt.svg)](https://npmjs.org/package/nimbu-toolbelt)
[![Downloads/week](https://img.shields.io/npm/dw/nimbu-toolbelt.svg)](https://npmjs.org/package/nimbu-toolbelt)
[![License](https://img.shields.io/npm/l/nimbu-toolbelt.svg)](https://github.com/zenjoy/nimbu-toolbelt/blob/master/package.json)

<!-- toc -->

- [Nimbu CLI](#nimbu-cli)
- [Usage](#usage)
- [Commands](#commands)
- [Command Topics](#command-topics)
- [Features](#features)
<!-- tocstop -->

# Usage

## Prerequisites

You need Node.js 18 or newer and `pnpm`. On macOS:

```
brew install node pnpm
```

## Getting started

Add this package to your project:

```
pnpm add -D nimbu
```

## Development server

To start developing on your project that uses this toolbelt, just run:

```
pnpm exec nimbu server
```

This will start the active bundler plugin. With the default webpack plugin you get the familiar `webpack-dev-server` on `http://localhost:4567/`. When the optional `@nimbu-cli/plugin-vite` is installed, the proxy continues to run on `http://localhost:4567/` while Vite serves assets from `http://localhost:5173/`.

## Pushing to nimbu

1. Stop your development server
2. Make a production build with `pnpm exec nimbu build`
3. Push to nimbu with `pnpm exec nimbu themes:push`

NOTE: Webpack generates `snippets/webpack.liquid` (and entry-specific
`snippets/webpack_<entry>.liquid`) while the Vite plugin generates
`snippets/vite.liquid` plus `snippets/vite_<entry>.liquid`. These snippets give
access to information about which files were produced and should be included in
your layout and pushed along with the rest of the theme.

# Commands

<!-- commands -->

# Command Topics

- [`nimbu apps`](docs/apps.md) - manage (cloud code) applications
- [`nimbu auth`](docs/auth.md) - authenticate, display token and current user
- [`nimbu autocomplete`](docs/autocomplete.md) - Display autocomplete installation instructions.
- [`nimbu browse`](docs/browse.md) - open the current site in your browser (simulator, admin)
- [`nimbu channels`](docs/channels.md) - working with channels
- [`nimbu commands`](docs/commands.md) - List all nimbu commands.
- [`nimbu config`](docs/config.md) - Show resolved configuration
- [`nimbu customers`](docs/customers.md) - working with customers
- [`nimbu help`](docs/help.md) - Display help for nimbu.
- [`nimbu init`](docs/init.md) - working directory initialization
- [`nimbu mails`](docs/mails.md) - manage your notification templates
- [`nimbu menus`](docs/menus.md) - copy menus from one site to another
- [`nimbu pages`](docs/pages.md) - copy page from one site to another
- [`nimbu plugins`](docs/plugins.md) - List installed plugins.
- [`nimbu products`](docs/products.md) - working with products
- [`nimbu sites`](docs/sites.md) - interacting with your sites (list, create)
- [`nimbu themes`](docs/themes.md) - working with themes (upload / download)
- [`nimbu translations`](docs/translations.md) - working with translations
- [`nimbu update`](docs/update.md) - update the nimbu CLI
- [`nimbu version`](docs/version.md)
- [`nimbu which`](docs/which.md) - Show which plugin a command is in.

<!-- commandsstop -->

# Features

Webpack is configured to support the features below. If you opt into the Vite plugin the same snippet contract applies, with assets emitted via Vite while keeping stable filenames.

## Coffeescript/Javascript

The javascripts pipeline supports:

- Coffeescript 2
  ([Breaking changes from 1.x](http://coffeescript.org/#breaking-changes))
- ES6 syntax with all features and polyfills that
  [create react app supports](https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md#supported-language-features-and-polyfills)
- Optional TypeScript: run `pnpm add -D typescript ts-loader` to enable it

There is one entrypoint `src/index.js` that gets compiled into `javascripts/app.js` and
`javascripts/vendor.js` (split automatically).

## (S)CSS

The CSS pipeline supports:

- SCSS using `sass-loader`
- Minification and autoprefixing using `postcss-loader` and `autoprefixer`

The entrypoint is `src/index.scss`, but any (S)CSS you import in your javascript
or coffeescript will also be included in the output.

To import scss files from `node_modules`, use a `~` prefix. For example,
to import bourbon that was added with `pnpm add bourbon`:

```
@import '~bourbon/core/bourbon';
```

In development mode, the CSS is injected dynamically into the DOM using
`style-loader` to support Hot Module Reloading. In production, the CSS is
extracted into `stylesheets/app.css`.

Sometimes the dynamic injecting of CSS breaks stuff. For example, if you use
javascript plugins that measure certain widths/heights when the document is
ready. These might execute before the styles get injected. To test these kind of
things, you can tell webpack to extract the CSS into `stylesheets/app.css` in
development too. Start the development server with the following command to do
that:

```
EXTRACT_CSS=true pnpm run start
```

## Using the webpack output in your layout

Webpack generates `snippets/webpack.liquid`. If you include that snippet, you
get access to:

- `webpack_build_timestamp`: timestamp of the moment that webpack generated the
  snippet. Useful in a cache key.
- `webpack_chunks`: an array of the names of the chunks that webpack generated.
- `webpack_js`: a map of chunkname to javascript filename for that chunk.
- `webpack_css`: a map of chunkname to array of css filenames for that chunk.

For example, you can use this snippet of liquid in your layout:

```
{% include 'webpack' %}
{% for chunk in webpack_chunks, cache: webpack_build_timestamp %}
{% for file in webpack_css[chunk] %}
{{ file | stylesheet_tag }}
{% endfor %}
{% endfor %}

{% for chunk in webpack_chunks, cache: webpack_build_timestamp %}
{{ webpack_js[chunk] | javascript_tag }}
{% endfor %}

When using the Vite plugin, include `vite` snippets instead:

```

{% include 'vite' %}
{% for chunk in vite_chunks, cache: vite_build_timestamp %}
{% for file in vite_css[chunk] %}
{{ file | stylesheet_tag }}
{% endfor %}
{% endfor %}

{% for chunk in vite_chunks, cache: vite_build_timestamp %}
{{ vite_js[chunk] | javascript_tag }}
{% endfor %}

```

```
