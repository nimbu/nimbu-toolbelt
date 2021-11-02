# Nimbu CLI

[![Build Status](https://travis-ci.org/nimbu/nimbu-toolbelt.png?branch=master)](https://travis-ci.org/nimbu/nimbu-toolbelt)
[![codecov](https://codecov.io/gh/nimbu/nimbu-toolbelt/branch/master/graph/badge.svg)](https://codecov.io/gh/nimbu/nimbu-toolbelt)

Toolbelt for Nimbu projects

[![Version](https://img.shields.io/npm/v/nimbu-toolbelt.svg)](https://npmjs.org/package/nimbu-toolbelt)
[![Downloads/week](https://img.shields.io/npm/dw/nimbu-toolbelt.svg)](https://npmjs.org/package/nimbu-toolbelt)
[![License](https://img.shields.io/npm/l/nimbu-toolbelt.svg)](https://github.com/zenjoy/nimbu-toolbelt/blob/master/package.json)

<!-- toc -->
* [Nimbu CLI](#nimbu-cli)
* [Usage](#usage)
* [Commands](#commands)
* [Command Topics](#command-topics)
* [Features](#features)
<!-- tocstop -->

# Usage

## Prerequisites

You need a recent `node` and `yarn`. On Mac OS X:

```
brew install node yarn
```

You still need what was needed to use the old toolchain (`ruby`, `bundler`, ...)

## Getting started

Add this package to your project:

```
yarn add --dev nimbu
```

This will also execute `bundle install` to install the old toolchain it uses.

## Development server

To start developing on your project that uses this toolbelt, just run:

```
yarn nimbu server
```

This will start a `webpack-dev-server` (and the old `nimbu server` that it
proxies to). Your browser should automatically open a connection to it at
`http://localhost:4567/`.

## Pushing to nimbu

1. Stop your development server
2. Make a production build with `yarn nimbu build`
3. Push to nimbu with `yarn nimbu themes:push` (this calls the ruby-based
   toolchain -> all arguments you know are supported)

NOTE: Both the development and production webpack configuration generate
`snippets/webpack.liquid` that gives access to the information about which files
webpack generated. This should be included and used in the layout of your theme.
Make sure that include is there and that you push the snippet to nimbu!

# Commands

<!-- commands -->
# Command Topics

* [`nimbu apps`](docs/apps.md) - manage (cloud code) applications
* [`nimbu auth`](docs/auth.md) - authenticate, display token and current user
* [`nimbu autocomplete`](docs/autocomplete.md) - display autocomplete installation instructions
* [`nimbu browse`](docs/browse.md) - open the current site in your browser (simulator, admin)
* [`nimbu channels`](docs/channels.md) - working with channels
* [`nimbu commands`](docs/commands.md) - list all the commands
* [`nimbu config`](docs/config.md) - Show resolved configuration
* [`nimbu customers`](docs/customers.md) - working with customers
* [`nimbu help`](docs/help.md) - display help for nimbu
* [`nimbu init`](docs/init.md) - working directory initialization
* [`nimbu mails`](docs/mails.md) - manage your notification templates
* [`nimbu menus`](docs/menus.md) - copy menus from one site to another
* [`nimbu pages`](docs/pages.md) - copy page from one site to another
* [`nimbu plugins`](docs/plugins.md) - list installed plugins
* [`nimbu products`](docs/products.md) - working with products
* [`nimbu sites`](docs/sites.md) - interacting with your sites (list, create)
* [`nimbu themes`](docs/themes.md) - working with themes (upload / download)
* [`nimbu translations`](docs/translations.md) - working with translations
* [`nimbu update`](docs/update.md) - update the nimbu CLI
* [`nimbu which`](docs/which.md) - show which plugin a command is in

<!-- commandsstop -->

# Features

Webpack is configured to support the features below.

## Coffeescript/Javascript

The javascripts pipeline supports:

- Coffeescript 2
  ([Breaking changes from 1.x](http://coffeescript.org/#breaking-changes))
- ES6 syntax with all features and polyfills that
  [create react app supports](https://github.com/facebook/create-react-app/blob/master/packages/react-scripts/template/README.md#supported-language-features-and-polyfills)
- Optional TypeScript: run `yarn add --dev typescript ts-loader` to enable it

There is one entrypoint `src/index.js` that gets compiled into `javascripts/app.js` and
`javascripts/vendor.js` (split automatically).

## (S)CSS

The CSS pipeline supports:

- SCSS using `sass-loader`
- Minification and autoprefixing using `postcss-loader` and `autoprefixer`

The entrypoint is `src/index.scss`, but any (S)CSS you import in your javascript
or coffeescript will also be included in the output.

To import scss files from `node_modules`, use a `~` prefix. For example,
to import bourbon that was added with `yarn add bourbon`:

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
EXTRACT_CSS=true yarn start
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
```
