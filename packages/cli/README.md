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
* [`nimbu apps:transpile SOURCE TARGET`](#nimbu-appstranspile-source-target)
* [`nimbu auth:login`](#nimbu-authlogin)
* [`nimbu auth:logout`](#nimbu-authlogout)
* [`nimbu auth:token`](#nimbu-authtoken)
* [`nimbu auth:whoami`](#nimbu-authwhoami)
* [`nimbu autocomplete [SHELL]`](#nimbu-autocomplete-shell)
* [`nimbu browse:admin`](#nimbu-browseadmin)
* [`nimbu browse:simulator`](#nimbu-browsesimulator)
* [`nimbu build`](#nimbu-build)
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
* [`nimbu server`](#nimbu-server)
* [`nimbu sites:list`](#nimbu-siteslist)
* [`nimbu themes:copy`](#nimbu-themescopy)
* [`nimbu themes:diff [THEME]`](#nimbu-themesdiff-theme)
* [`nimbu themes:list [THEME]`](#nimbu-themeslist-theme)
* [`nimbu themes:pull`](#nimbu-themespull)
* [`nimbu themes:push [FILES]`](#nimbu-themespush-files)
* [`nimbu translations:copy [QUERY]`](#nimbu-translationscopy-query)

## `nimbu apps:config`

Add an app to the local configuration

```
Add an app to the local configuration

USAGE
  $ nimbu apps:config
```

_See code: [src/commands/apps/config.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/apps/config.ts)_

## `nimbu apps:list`

List the applications registered in Nimbu

```
List the applications registered in Nimbu

USAGE
  $ nimbu apps:list
```

_See code: [src/commands/apps/list.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/apps/list.ts)_

## `nimbu apps:push [FILES]`

Push your cloud code files to nimbu

```
Push your cloud code files to nimbu

USAGE
  $ nimbu apps:push [FILES]

ARGUMENTS
  FILES  The files to push.

OPTIONS
  -a, --app=app  The (local) name of the application to push to (see apps:list and apps:config).
```

_See code: [src/commands/apps/push.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/apps/push.ts)_

## `nimbu apps:transpile SOURCE TARGET`

Transpile a file from ES6 to ES5 for compatiblity with Nimbu Cloud applications

```
Transpile a file from ES6 to ES5 for compatiblity with Nimbu Cloud applications

USAGE
  $ nimbu apps:transpile SOURCE TARGET
```

_See code: [src/commands/apps/transpile.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/apps/transpile.ts)_

## `nimbu auth:login`

login with your nimbu credentials

```
login with your nimbu credentials

USAGE
  $ nimbu auth:login

OPTIONS
  -e, --expires-in=expires-in  duration of token in seconds (default 1 year)

ALIASES
  $ nimbu login
```

_See code: [src/commands/auth/login.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/auth/login.ts)_

## `nimbu auth:logout`

clears local login credentials and invalidates API session

```
clears local login credentials and invalidates API session

USAGE
  $ nimbu auth:logout

ALIASES
  $ nimbu logout
```

_See code: [src/commands/auth/logout.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/auth/logout.ts)_

## `nimbu auth:token`

outputs current CLI authentication token.

```
outputs current CLI authentication token.
By default, the CLI auth token is only valid for 1 year. To generate a long-lived token, use nimbu authorizations:create

USAGE
  $ nimbu auth:token

OPTIONS
  -h, --help  show CLI help

DESCRIPTION
  By default, the CLI auth token is only valid for 1 year. To generate a long-lived token, use nimbu 
  authorizations:create
```

_See code: [src/commands/auth/token.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/auth/token.ts)_

## `nimbu auth:whoami`

display the current logged in user

```
display the current logged in user

USAGE
  $ nimbu auth:whoami

ALIASES
  $ nimbu whoami
```

_See code: [src/commands/auth/whoami.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/auth/whoami.ts)_

## `nimbu autocomplete [SHELL]`

display autocomplete installation instructions

```
display autocomplete installation instructions

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

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v0.1.5/src/commands/autocomplete/index.ts)_

## `nimbu browse:admin`

open the admin area for your current site

```
open the admin area for your current site

USAGE
  $ nimbu browse:admin
```

_See code: [src/commands/browse/admin.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/browse/admin.ts)_

## `nimbu browse:simulator`

open the simulator for your current site

```
open the simulator for your current site

USAGE
  $ nimbu browse:simulator
```

_See code: [src/commands/browse/simulator.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/browse/simulator.ts)_

## `nimbu build`

build a production version of your javascript and CSS

```
build a production version of your javascript and CSS

USAGE
  $ nimbu build
```

_See code: [src/commands/build.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/build.ts)_

## `nimbu channels:copy`

copy channel configuration from one to another

```
copy channel configuration from one to another

USAGE
  $ nimbu channels:copy

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [src/commands/channels/copy.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/channels/copy.ts)_

## `nimbu channels:diff`

check differences between channel settings from one to another

```
check differences between channel settings from one to another

USAGE
  $ nimbu channels:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [src/commands/channels/diff.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/channels/diff.ts)_

## `nimbu channels:entries:copy`

copy channel entries from one to another

```
copy channel entries from one to another

USAGE
  $ nimbu channels:entries:copy

OPTIONS
  -f, --from=from          (required) slug of the source channel
  -p, --per_page=per_page  number of entries to fetch per page
  -q, --query=query        query params to apply to source channel
  -t, --to=to              (required) slug of the target channel
  -u, --upsert=upsert      name of parameter to use for matching existing documents
```

_See code: [src/commands/channels/entries/copy.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/channels/entries/copy.ts)_

## `nimbu config`

Show resolved configuration

```
Show resolved configuration

USAGE
  $ nimbu config
```

_See code: [src/commands/config.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/config.ts)_

## `nimbu customers:config:copy`

copy customer customizations from one to another

```
copy customer customizations from one to another

USAGE
  $ nimbu customers:config:copy

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
```

_See code: [src/commands/customers/config/copy.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/customers/config/copy.ts)_

## `nimbu customers:config:diff`

check differences between customer customizations from one to another

```
check differences between customer customizations from one to another

USAGE
  $ nimbu customers:config:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [src/commands/customers/config/diff.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/customers/config/diff.ts)_

## `nimbu help [COMMAND]`

display help for nimbu

```
display help for <%= config.bin %>

USAGE
  $ nimbu help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `nimbu init`

initialize your working directory to code a selected theme

```
initialize your working directory to code a selected theme

USAGE
  $ nimbu init

OPTIONS
  -c, --cloudcode  Create CloudCode directory
  -h, --haml       Use HAML for the templates in this project
  -s, --site=site  The site (use the Nimbu subdomain) to link to this project.
```

_See code: [src/commands/init/index.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/init/index.ts)_

## `nimbu mails:pull`

download all notification templates

```
download all notification templates

USAGE
  $ nimbu mails:pull
```

_See code: [src/commands/mails/pull.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/mails/pull.ts)_

## `nimbu mails:push`

upload all notification templates

```
upload all notification templates

USAGE
  $ nimbu mails:push

OPTIONS
  -o, --only=only  the names of the templates to push online
```

_See code: [src/commands/mails/push.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/mails/push.ts)_

## `nimbu menus:copy [SLUG]`

copy menus from one site to another

```
copy menus from one site to another

USAGE
  $ nimbu menus:copy [SLUG]

ARGUMENTS
  SLUG  permalink of menu to be copied

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
```

_See code: [src/commands/menus/copy.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/menus/copy.ts)_

## `nimbu pages:copy [FULLPATH]`

copy page from one site to another

```
copy page from one site to another

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

_See code: [src/commands/pages/copy.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/pages/copy.ts)_

## `nimbu products:config:copy`

copy product customizations from one to another

```
copy product customizations from one to another

USAGE
  $ nimbu products:config:copy

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
```

_See code: [src/commands/products/config/copy.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/products/config/copy.ts)_

## `nimbu products:config:diff`

check differences between product customizations from one to another

```
check differences between product customizations from one to another

USAGE
  $ nimbu products:config:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [src/commands/products/config/diff.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/products/config/diff.ts)_

## `nimbu server`

run the development server

```
run the development server

USAGE
  $ nimbu server

OPTIONS
  --compass                Use legacy ruby SASS compilation.
  --host=host              [default: 0.0.0.0] The hostname/ip-address to bind on.
  --nimbu-port=nimbu-port  [default: 4568] The port for the ruby nimbu server to listen on.
  --nocookies              Leave cookies untouched i.s.o. clearing them.
  --noopen                 Don't open/reload browser
  --nowebpack              Do not use webpack.
  --poll                   Tell webpack dev server to use polling
  --port=port              [default: 4567] The port to listen on.
```

_See code: [src/commands/server.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/server.ts)_

## `nimbu sites:list`

list sites you can edit

```
list sites you can edit

USAGE
  $ nimbu sites:list

OPTIONS
  -s, --subdomain  show Nimbu subdomain for each site

ALIASES
  $ nimbu sites
```

_See code: [src/commands/sites/list.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/sites/list.ts)_

## `nimbu themes:copy`

copy themes from one site to another

```
copy themes from one site to another

USAGE
  $ nimbu themes:copy

OPTIONS
  -f, --from=from      (required) slug of the source theme
  -t, --to=to          (required) slug of the target theme
  --fromHost=fromHost  hostname of origin Nimbu API
  --toHost=toHost      hostname of target Nimbu API
```

_See code: [src/commands/themes/copy.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/themes/copy.ts)_

## `nimbu themes:diff [THEME]`

describe the command here

```
describe the command here

USAGE
  $ nimbu themes:diff [THEME]

ARGUMENTS
  THEME  The name of the theme to list
```

_See code: [src/commands/themes/diff.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/themes/diff.ts)_

## `nimbu themes:list [THEME]`

list all layouts, templates and assets

```
list all layouts, templates and assets

USAGE
  $ nimbu themes:list [THEME]

ARGUMENTS
  THEME  The name of the theme to list
```

_See code: [src/commands/themes/list.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/themes/list.ts)_

## `nimbu themes:pull`

download all code and assets for a theme

```
download all code and assets for a theme

USAGE
  $ nimbu themes:pull

OPTIONS
  -s, --site=site    the site of the theme
  -t, --theme=theme  [default: default-theme] slug of the theme
  --liquid-only      only download template files
```

_See code: [src/commands/themes/pull.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/themes/pull.ts)_

## `nimbu themes:push [FILES]`

push the theme code online

```
push the theme code online

USAGE
  $ nimbu themes:push [FILES]

ARGUMENTS
  FILES  The files to push with --only

OPTIONS
  --css-only     only push css
  --fonts-only   only push fonts
  --force        skip the usage check and upload anyway
  --images-only  only push new images
  --js-only      only push javascript
  --liquid-only  only push template code
  --only         only push the files given on the command line
```

_See code: [src/commands/themes/push.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/themes/push.ts)_

## `nimbu translations:copy [QUERY]`

copy translations from one site to another

```
copy translations from one site to another

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

_See code: [src/commands/translations/copy.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v4.1.6/src/commands/translations/copy.ts)_
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
