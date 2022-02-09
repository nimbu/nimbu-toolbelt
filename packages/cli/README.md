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
* [`nimbu channels:info CHANNEL`](#nimbu-channelsinfo-channel)
* [`nimbu commands`](#nimbu-commands)
* [`nimbu config`](#nimbu-config)
* [`nimbu customers:config:copy`](#nimbu-customersconfigcopy)
* [`nimbu customers:config:diff`](#nimbu-customersconfigdiff)
* [`nimbu help [COMMAND]`](#nimbu-help-command)
* [`nimbu init`](#nimbu-init)
* [`nimbu mails:pull`](#nimbu-mailspull)
* [`nimbu mails:push`](#nimbu-mailspush)
* [`nimbu menus:copy [SLUG]`](#nimbu-menuscopy-slug)
* [`nimbu pages:copy [FULLPATH]`](#nimbu-pagescopy-fullpath)
* [`nimbu plugins`](#nimbu-plugins)
* [`nimbu plugins:inspect PLUGIN...`](#nimbu-pluginsinspect-plugin)
* [`nimbu plugins:install PLUGIN...`](#nimbu-pluginsinstall-plugin)
* [`nimbu plugins:link PLUGIN`](#nimbu-pluginslink-plugin)
* [`nimbu plugins:uninstall PLUGIN...`](#nimbu-pluginsuninstall-plugin)
* [`nimbu plugins:update`](#nimbu-pluginsupdate)
* [`nimbu products:config:copy`](#nimbu-productsconfigcopy)
* [`nimbu products:config:diff`](#nimbu-productsconfigdiff)
* [`nimbu sites:copy`](#nimbu-sitescopy)
* [`nimbu sites:list`](#nimbu-siteslist)
* [`nimbu themes:copy`](#nimbu-themescopy)
* [`nimbu themes:pull`](#nimbu-themespull)
* [`nimbu translations:copy [QUERY]`](#nimbu-translationscopy-query)
* [`nimbu update [CHANNEL]`](#nimbu-update-channel)
* [`nimbu version`](#nimbu-version)
* [`nimbu which`](#nimbu-which)

## `nimbu apps:config`

Add an app to the local configuration

```
USAGE
  $ nimbu apps:config

DESCRIPTION
  Add an app to the local configuration
```

_See code: [lib/commands/apps/config.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/apps/config.js)_

## `nimbu apps:list`

List the applications registered in Nimbu

```
USAGE
  $ nimbu apps:list

DESCRIPTION
  List the applications registered in Nimbu
```

_See code: [lib/commands/apps/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/apps/list.js)_

## `nimbu apps:push [FILES]`

Push your cloud code files to nimbu

```
USAGE
  $ nimbu apps:push [FILES] [-a <value>]

ARGUMENTS
  FILES  The files to push.

FLAGS
  -a, --app=<value>  The (local) name of the application to push to (see apps:list and apps:config).

DESCRIPTION
  Push your cloud code files to nimbu
```

_See code: [lib/commands/apps/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/apps/push.js)_

## `nimbu auth:login`

login with your nimbu credentials

```
USAGE
  $ nimbu auth:login [-e <value>]

FLAGS
  -e, --expires-in=<value>  duration of token in seconds (default 1 year)

DESCRIPTION
  login with your nimbu credentials

ALIASES
  $ nimbu login
```

_See code: [lib/commands/auth/login.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/auth/login.js)_

## `nimbu auth:logout`

clears local login credentials and invalidates API session

```
USAGE
  $ nimbu auth:logout

DESCRIPTION
  clears local login credentials and invalidates API session

ALIASES
  $ nimbu logout
```

_See code: [lib/commands/auth/logout.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/auth/logout.js)_

## `nimbu auth:token`

outputs current CLI authentication token.

```
USAGE
  $ nimbu auth:token [-h]

FLAGS
  -h, --help  Show CLI help.

DESCRIPTION
  outputs current CLI authentication token.

  By default, the CLI auth token is only valid for 1 year. To generate a long-lived token, use nimbu
  authorizations:create
```

_See code: [lib/commands/auth/token.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/auth/token.js)_

## `nimbu auth:whoami`

display the current logged in user

```
USAGE
  $ nimbu auth:whoami

DESCRIPTION
  display the current logged in user

ALIASES
  $ nimbu whoami
```

_See code: [lib/commands/auth/whoami.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/auth/whoami.js)_

## `nimbu autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ nimbu autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  display autocomplete installation instructions

EXAMPLES
  $ nimbu autocomplete

  $ nimbu autocomplete bash

  $ nimbu autocomplete zsh

  $ nimbu autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v1.2.0/src/commands/autocomplete/index.ts)_

## `nimbu browse:admin`

open the admin area for your current site

```
USAGE
  $ nimbu browse:admin

DESCRIPTION
  open the admin area for your current site
```

_See code: [lib/commands/browse/admin.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/browse/admin.js)_

## `nimbu browse:simulator`

open the simulator for your current site

```
USAGE
  $ nimbu browse:simulator

DESCRIPTION
  open the simulator for your current site
```

_See code: [lib/commands/browse/simulator.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/browse/simulator.js)_

## `nimbu channels:copy`

copy channel configuration from one to another

```
USAGE
  $ nimbu channels:copy -f <value> -t <value> [--force] [-a]

FLAGS
  -a, --all           copy all channels from source to target
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel
  --force             do not ask confirmation to overwrite existing channel

DESCRIPTION
  copy channel configuration from one to another
```

_See code: [lib/commands/channels/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/channels/copy.js)_

## `nimbu channels:diff`

check differences between channel settings from one to another

```
USAGE
  $ nimbu channels:diff -f <value> -t <value>

FLAGS
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel

DESCRIPTION
  check differences between channel settings from one to another
```

_See code: [lib/commands/channels/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/channels/diff.js)_

## `nimbu channels:entries:copy`

copy channel entries from one to another

```
USAGE
  $ nimbu channels:entries:copy -f <value> -t <value> [-q <value>] [-w <value>] [-u <value>] [-p <value>] [-r] [--only
    <value>] [--copy-customers] [--allow-errors]

FLAGS
  -f, --from=<value>      (required) slug of the source channel
  -p, --per-page=<value>  number of entries to fetch per page
  -q, --query=<value>     query params to append to source channel api call
  -r, --recursive         automatically copy all dependent objects
  -t, --to=<value>        (required) slug of the target channel
  -u, --upsert=<value>    name of parameter to use for matching existing documents
  -w, --where=<value>     query expression to filter the source channel
  --allow-errors          do not stop when an item fails and continue with the other
  --copy-customers        copy and replicate all owners related to the objects we are copying
  --only=<value>          limit copy of channels to this list (comma-separated)

DESCRIPTION
  copy channel entries from one to another
```

_See code: [lib/commands/channels/entries/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/channels/entries/copy.js)_

## `nimbu channels:info CHANNEL`

list info about this channel

```
USAGE
  $ nimbu channels:info [CHANNEL] [--columns <value> | -x] [--sort <value>] [--filter <value>] [--output
    csv|json|yaml|ts |  | [--csv | --no-truncate]] [--no-header | ]

ARGUMENTS
  CHANNEL  slug of your channel (optionally with the site, i.e. site/channel)

FLAGS
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --csv              output is csv format [alias: --output=csv]
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml|ts>
  --sort=<value>     property to sort by (prepend '-' for descending)

DESCRIPTION
  list info about this channel
```

_See code: [lib/commands/channels/info.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/channels/info.js)_

## `nimbu commands`

list all the commands

```
USAGE
  $ nimbu commands [--json] [-h] [--hidden] [--columns <value> | -x] [--sort <value>] [--filter <value>]
    [--output csv|json|yaml |  | [--csv | --no-truncate]] [--no-header | ]

FLAGS
  -h, --help         Show CLI help.
  -x, --extended     show extra columns
  --columns=<value>  only show provided columns (comma-separated)
  --csv              output is csv format [alias: --output=csv]
  --filter=<value>   filter property by partial string matching, ex: name=foo
  --hidden           show hidden commands
  --no-header        hide table header from output
  --no-truncate      do not truncate output to fit screen
  --output=<option>  output in a more machine friendly format
                     <options: csv|json|yaml>
  --sort=<value>     property to sort by (prepend '-' for descending)

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  list all the commands
```

_See code: [@oclif/plugin-commands](https://github.com/oclif/plugin-commands/blob/v2.1.0/src/commands/commands.ts)_

## `nimbu config`

Show resolved configuration

```
USAGE
  $ nimbu config

DESCRIPTION
  Show resolved configuration
```

_See code: [lib/commands/config.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/config.js)_

## `nimbu customers:config:copy`

copy customer customizations from one to another

```
USAGE
  $ nimbu customers:config:copy [-f <value>] [-t <value>]

FLAGS
  -f, --from=<value>  subdomain of the source site
  -t, --to=<value>    subdomain of the destination site

DESCRIPTION
  copy customer customizations from one to another
```

_See code: [lib/commands/customers/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/customers/config/copy.js)_

## `nimbu customers:config:diff`

check differences between customer customizations from one to another

```
USAGE
  $ nimbu customers:config:diff -f <value> -t <value>

FLAGS
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel

DESCRIPTION
  check differences between customer customizations from one to another
```

_See code: [lib/commands/customers/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/customers/config/diff.js)_

## `nimbu help [COMMAND]`

Display help for nimbu.

```
USAGE
  $ nimbu help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for nimbu.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.11/src/commands/help.ts)_

## `nimbu init`

initialize your working directory to code a selected theme

```
USAGE
  $ nimbu init [-c] [-h] [-s <value>]

FLAGS
  -c, --cloudcode     Create CloudCode directory
  -h, --haml          Use HAML for the templates in this project
  -s, --site=<value>  The site (use the Nimbu subdomain) to link to this project.

DESCRIPTION
  initialize your working directory to code a selected theme
```

_See code: [lib/commands/init/index.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/init/index.js)_

## `nimbu mails:pull`

download all notification templates

```
USAGE
  $ nimbu mails:pull [-o <value>]

FLAGS
  -o, --only=<value>...  the names of the templates to pull from Nimbu

DESCRIPTION
  download all notification templates
```

_See code: [lib/commands/mails/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/mails/pull.js)_

## `nimbu mails:push`

upload all notification templates

```
USAGE
  $ nimbu mails:push [-o <value>]

FLAGS
  -o, --only=<value>...  the names of the templates to push online

DESCRIPTION
  upload all notification templates
```

_See code: [lib/commands/mails/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/mails/push.js)_

## `nimbu menus:copy [SLUG]`

copy menus from one site to another

```
USAGE
  $ nimbu menus:copy [SLUG] [-f <value>] [-t <value>]

ARGUMENTS
  SLUG  permalink of menu to be copied

FLAGS
  -f, --from=<value>  subdomain of the source site
  -t, --to=<value>    subdomain of the destination site

DESCRIPTION
  copy menus from one site to another
```

_See code: [lib/commands/menus/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/menus/copy.js)_

## `nimbu pages:copy [FULLPATH]`

copy page from one site to another

```
USAGE
  $ nimbu pages:copy [FULLPATH] [-f <value>] [-t <value>] [--toHost <value>] [--fromHost <value>]

ARGUMENTS
  FULLPATH  [default: *] fullpath of pages to be copied

FLAGS
  -f, --from=<value>  subdomain of the source site
  -t, --to=<value>    subdomain of the destination site
  --fromHost=<value>  hostname of origin Nimbu API
  --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy page from one site to another
```

_See code: [lib/commands/pages/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/pages/copy.js)_

## `nimbu plugins`

List installed plugins.

```
USAGE
  $ nimbu plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ nimbu plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/index.ts)_

## `nimbu plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ nimbu plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ nimbu plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/inspect.ts)_

## `nimbu plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ nimbu plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ nimbu plugins:add

EXAMPLES
  $ nimbu plugins:install myplugin 

  $ nimbu plugins:install https://github.com/someuser/someplugin

  $ nimbu plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/install.ts)_

## `nimbu plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ nimbu plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ nimbu plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/link.ts)_

## `nimbu plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ nimbu plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nimbu plugins:unlink
  $ nimbu plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/uninstall.ts)_

## `nimbu plugins:update`

Update installed plugins.

```
USAGE
  $ nimbu plugins:update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/update.ts)_

## `nimbu products:config:copy`

copy product customizations from one to another

```
USAGE
  $ nimbu products:config:copy [-f <value>] [-t <value>]

FLAGS
  -f, --from=<value>  subdomain of the source site
  -t, --to=<value>    subdomain of the destination site

DESCRIPTION
  copy product customizations from one to another
```

_See code: [lib/commands/products/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/products/config/copy.js)_

## `nimbu products:config:diff`

check differences between product customizations from one to another

```
USAGE
  $ nimbu products:config:diff -f <value> -t <value>

FLAGS
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel

DESCRIPTION
  check differences between product customizations from one to another
```

_See code: [lib/commands/products/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/products/config/diff.js)_

## `nimbu sites:copy`

copy a complete site from one to another

```
USAGE
  $ nimbu sites:copy [-f <value>] [-t <value>] [--force]

FLAGS
  -f, --from=<value>  subdomain of the source site
  -t, --to=<value>    subdomain of the destination site
  --force             do not ask confirmation to overwrite existing channel

DESCRIPTION
  copy a complete site from one to another
```

_See code: [lib/commands/sites/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/sites/copy.js)_

## `nimbu sites:list`

list sites you can edit

```
USAGE
  $ nimbu sites:list [-s]

FLAGS
  -s, --subdomain  show Nimbu subdomain for each site

DESCRIPTION
  list sites you can edit

ALIASES
  $ nimbu sites
```

_See code: [lib/commands/sites/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/sites/list.js)_

## `nimbu themes:copy`

copy themes from one site to another

```
USAGE
  $ nimbu themes:copy -f <value> -t <value> [--toHost <value>] [--fromHost <value>] [--liquid-only]

FLAGS
  -f, --from=<value>  (required) slug of the source theme
  -t, --to=<value>    (required) slug of the target theme
  --fromHost=<value>  hostname of origin Nimbu API
  --liquid-only       only copy the templates
  --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy themes from one site to another
```

_See code: [lib/commands/themes/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/themes/copy.js)_

## `nimbu themes:pull`

download all code and assets for a theme

```
USAGE
  $ nimbu themes:pull [-t <value>] [-s <value>] [--liquid-only]

FLAGS
  -s, --site=<value>   the site of the theme
  -t, --theme=<value>  [default: default-theme] slug of the theme
  --liquid-only        only download template files

DESCRIPTION
  download all code and assets for a theme
```

_See code: [lib/commands/themes/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/themes/pull.js)_

## `nimbu translations:copy [QUERY]`

copy translations from one site to another

```
USAGE
  $ nimbu translations:copy [QUERY] [-f <value>] [-t <value>] [--toHost <value>] [--fromHost <value>]

ARGUMENTS
  QUERY  [default: *] query to match subset of translations to be copied

FLAGS
  -f, --from=<value>  subdomain of the source site
  -t, --to=<value>    subdomain of the destination site
  --fromHost=<value>  hostname of origin Nimbu API
  --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy translations from one site to another
```

_See code: [lib/commands/translations/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/translations/copy.js)_

## `nimbu update [CHANNEL]`

update the nimbu CLI

```
USAGE
  $ nimbu update [CHANNEL] [--from-local]

FLAGS
  --from-local  interactively choose an already installed version

DESCRIPTION
  update the nimbu CLI
```

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v2.2.0/src/commands/update.ts)_

## `nimbu version`

```
USAGE
  $ nimbu version
```

_See code: [lib/commands/version.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.1.0/lib/commands/version.js)_

## `nimbu which`

Show which plugin a command is in.

```
USAGE
  $ nimbu which

DESCRIPTION
  Show which plugin a command is in.
```

_See code: [@oclif/plugin-which](https://github.com/oclif/plugin-which/blob/v2.1.0/src/commands/which.ts)_
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
