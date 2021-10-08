# nimbu-toolbelt

[![Build Status](https://travis-ci.org/nimbu/nimbu-toolbelt.png?branch=master)](https://travis-ci.org/nimbu/nimbu-toolbelt)
[![codecov](https://codecov.io/gh/nimbu/nimbu-toolbelt/branch/master/graph/badge.svg)](https://codecov.io/gh/nimbu/nimbu-toolbelt)

Toolbelt for Nimbu projects

[![Version](https://img.shields.io/npm/v/nimbu-toolbelt.svg)](https://npmjs.org/package/nimbu-toolbelt)
[![Downloads/week](https://img.shields.io/npm/dw/nimbu-toolbelt.svg)](https://npmjs.org/package/nimbu-toolbelt)
[![License](https://img.shields.io/npm/l/nimbu-toolbelt.svg)](https://github.com/zenjoy/nimbu-toolbelt/blob/master/package.json)

<!-- toc -->
* [nimbu-toolbelt](#nimbu-toolbelt)
* [Usage](#usage)
* [Commands](#commands)
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
yarn add --dev nimbu-toolbelt
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
* [`nimbu apps:config`](#nimbu-appsconfig)
* [`nimbu apps:list`](#nimbu-appslist)
* [`nimbu apps:push [FILES]`](#nimbu-appspush-files)
* [`nimbu auth:login`](#nimbu-authlogin)
* [`nimbu auth:logout`](#nimbu-authlogout)
* [`nimbu auth:token`](#nimbu-authtoken)
* [`nimbu auth:whoami`](#nimbu-authwhoami)
* [`nimbu autocomplete [SHELL]`](#nimbu-autocomplete-shell)
* [`nimbu browse:admin`](#nimbu-browseadmin)
* [`nimbu browse:simulator`](#nimbu-browsesimulator)
* [`nimbu channels:copy`](#nimbu-channelscopy)
* [`nimbu channels:diff`](#nimbu-channelsdiff)
* [`nimbu channels:entries:copy`](#nimbu-channelsentriescopy)
* [`nimbu config`](#nimbu-config)
* [`nimbu customers:config:copy`](#nimbu-customersconfigcopy)
* [`nimbu customers:config:diff`](#nimbu-customersconfigdiff)
* [`nimbu help [COMMAND]`](#nimbu-help-command)
* [`nimbu init`](#nimbu-init)
* [`nimbu mails:pull`](#nimbu-mailspull)
* [`nimbu mails:push`](#nimbu-mailspush)
* [`nimbu menus:copy [SLUG]`](#nimbu-menuscopy-slug)
* [`nimbu pages:copy [FULLPATH]`](#nimbu-pagescopy-fullpath)
* [`nimbu products:config:copy`](#nimbu-productsconfigcopy)
* [`nimbu products:config:diff`](#nimbu-productsconfigdiff)
* [`nimbu sites:list`](#nimbu-siteslist)
* [`nimbu themes:copy`](#nimbu-themescopy)
* [`nimbu themes:pull`](#nimbu-themespull)
* [`nimbu translations:copy [QUERY]`](#nimbu-translationscopy-query)

## `nimbu apps:config`

Add an app to the local configuration

```
USAGE
  $ nimbu apps:config
```

_See code: [lib/commands/apps/config.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/apps/config.js)_

## `nimbu apps:list`

List the applications registered in Nimbu

```
USAGE
  $ nimbu apps:list
```

_See code: [lib/commands/apps/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/apps/list.js)_

## `nimbu apps:push [FILES]`

Push your cloud code files to nimbu

```
USAGE
  $ nimbu apps:push [FILES]

ARGUMENTS
  FILES  The files to push.

OPTIONS
  -a, --app=app  The (local) name of the application to push to (see apps:list and apps:config).
```

_See code: [lib/commands/apps/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/apps/push.js)_

## `nimbu auth:login`

login with your nimbu credentials

```
USAGE
  $ nimbu auth:login

OPTIONS
  -e, --expires-in=expires-in  duration of token in seconds (default 1 year)

ALIASES
  $ nimbu login
```

_See code: [lib/commands/auth/login.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/auth/login.js)_

## `nimbu auth:logout`

clears local login credentials and invalidates API session

```
USAGE
  $ nimbu auth:logout

ALIASES
  $ nimbu logout
```

_See code: [lib/commands/auth/logout.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/auth/logout.js)_

## `nimbu auth:token`

outputs current CLI authentication token.

```
USAGE
  $ nimbu auth:token

OPTIONS
  -h, --help  show CLI help

DESCRIPTION
  By default, the CLI auth token is only valid for 1 year. To generate a long-lived token, use nimbu 
  authorizations:create
```

_See code: [lib/commands/auth/token.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/auth/token.js)_

## `nimbu auth:whoami`

display the current logged in user

```
USAGE
  $ nimbu auth:whoami

ALIASES
  $ nimbu whoami
```

_See code: [lib/commands/auth/whoami.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/auth/whoami.js)_

## `nimbu autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ nimbu autocomplete [SHELL]

ARGUMENTS
  SHELL  shell type

OPTIONS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

EXAMPLES
  $ nimbu autocomplete
  $ nimbu autocomplete bash
  $ nimbu autocomplete zsh
  $ nimbu autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v0.3.0/src/commands/autocomplete/index.ts)_

## `nimbu browse:admin`

open the admin area for your current site

```
USAGE
  $ nimbu browse:admin
```

_See code: [lib/commands/browse/admin.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/browse/admin.js)_

## `nimbu browse:simulator`

open the simulator for your current site

```
USAGE
  $ nimbu browse:simulator
```

_See code: [lib/commands/browse/simulator.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/browse/simulator.js)_

## `nimbu channels:copy`

copy channel configuration from one to another

```
USAGE
  $ nimbu channels:copy

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [lib/commands/channels/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/channels/copy.js)_

## `nimbu channels:diff`

check differences between channel settings from one to another

```
USAGE
  $ nimbu channels:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [lib/commands/channels/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/channels/diff.js)_

## `nimbu channels:entries:copy`

copy channel entries from one to another

```
USAGE
  $ nimbu channels:entries:copy

OPTIONS
  -f, --from=from          (required) slug of the source channel
  -p, --per_page=per_page  number of entries to fetch per page
  -q, --query=query        query params to apply to source channel
  -t, --to=to              (required) slug of the target channel
  -u, --upsert=upsert      name of parameter to use for matching existing documents
```

_See code: [lib/commands/channels/entries/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/channels/entries/copy.js)_

## `nimbu config`

Show resolved configuration

```
USAGE
  $ nimbu config
```

_See code: [lib/commands/config.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/config.js)_

## `nimbu customers:config:copy`

copy customer customizations from one to another

```
USAGE
  $ nimbu customers:config:copy

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
```

_See code: [lib/commands/customers/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/customers/config/copy.js)_

## `nimbu customers:config:diff`

check differences between customer customizations from one to another

```
USAGE
  $ nimbu customers:config:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [lib/commands/customers/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/customers/config/diff.js)_

## `nimbu help [COMMAND]`

display help for nimbu

```
USAGE
  $ nimbu help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.3/src/commands/help.ts)_

## `nimbu init`

initialize your working directory to code a selected theme

```
USAGE
  $ nimbu init

OPTIONS
  -c, --cloudcode  Create CloudCode directory
  -h, --haml       Use HAML for the templates in this project
  -s, --site=site  The site (use the Nimbu subdomain) to link to this project.
```

_See code: [lib/commands/init/index.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/init/index.js)_

## `nimbu mails:pull`

download all notification templates

```
USAGE
  $ nimbu mails:pull

OPTIONS
  -o, --only=only  the names of the templates to pull from Nimbu
```

_See code: [lib/commands/mails/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/mails/pull.js)_

## `nimbu mails:push`

upload all notification templates

```
USAGE
  $ nimbu mails:push

OPTIONS
  -o, --only=only  the names of the templates to push online
```

_See code: [lib/commands/mails/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/mails/push.js)_

## `nimbu menus:copy [SLUG]`

copy menus from one site to another

```
USAGE
  $ nimbu menus:copy [SLUG]

ARGUMENTS
  SLUG  permalink of menu to be copied

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
```

_See code: [lib/commands/menus/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/menus/copy.js)_

## `nimbu pages:copy [FULLPATH]`

copy page from one site to another

```
USAGE
  $ nimbu pages:copy [FULLPATH]

ARGUMENTS
  FULLPATH  [default: *] fullpath of pages to be copied

OPTIONS
  -f, --from=from      subdomain of the source site
  -t, --to=to          subdomain of the destination site
  --fromHost=fromHost  hostname of origin Nimbu API
  --toHost=toHost      hostname of target Nimbu API
```

_See code: [lib/commands/pages/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/pages/copy.js)_

## `nimbu products:config:copy`

copy product customizations from one to another

```
USAGE
  $ nimbu products:config:copy

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
```

_See code: [lib/commands/products/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/products/config/copy.js)_

## `nimbu products:config:diff`

check differences between product customizations from one to another

```
USAGE
  $ nimbu products:config:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [lib/commands/products/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/products/config/diff.js)_

## `nimbu sites:list`

list sites you can edit

```
USAGE
  $ nimbu sites:list

OPTIONS
  -s, --subdomain  show Nimbu subdomain for each site

ALIASES
  $ nimbu sites
```

_See code: [lib/commands/sites/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/sites/list.js)_

## `nimbu themes:copy`

copy themes from one site to another

```
USAGE
  $ nimbu themes:copy

OPTIONS
  -f, --from=from      (required) slug of the source theme
  -t, --to=to          (required) slug of the target theme
  --fromHost=fromHost  hostname of origin Nimbu API
  --toHost=toHost      hostname of target Nimbu API
```

_See code: [lib/commands/themes/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/themes/copy.js)_

## `nimbu themes:pull`

download all code and assets for a theme

```
USAGE
  $ nimbu themes:pull

OPTIONS
  -s, --site=site    the site of the theme
  -t, --theme=theme  [default: default-theme] slug of the theme
  --liquid-only      only download template files
```

_See code: [lib/commands/themes/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/themes/pull.js)_

## `nimbu translations:copy [QUERY]`

copy translations from one site to another

```
USAGE
  $ nimbu translations:copy [QUERY]

ARGUMENTS
  QUERY  [default: *] query to match subset of translations to be copied

OPTIONS
  -f, --from=from      subdomain of the source site
  -t, --to=to          subdomain of the destination site
  --fromHost=fromHost  hostname of origin Nimbu API
  --toHost=toHost      hostname of target Nimbu API
```

_See code: [lib/commands/translations/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0/lib/commands/translations/copy.js)_
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
