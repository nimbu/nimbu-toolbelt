# Nimbu CLI

[![Build Status](https://travis-ci.org/nimbu/nimbu-toolbelt.png?branch=master)](https://travis-ci.org/nimbu/nimbu-toolbelt)
[![codecov](https://codecov.io/gh/nimbu/nimbu-toolbelt/branch/master/graph/badge.svg)](https://codecov.io/gh/nimbu/nimbu-toolbelt)

Toolbelt for Nimbu projects

[![Version](https://img.shields.io/npm/v/nimbu-toolbelt.svg)](https://npmjs.org/package/nimbu-toolbelt)
[![Downloads/week](https://img.shields.io/npm/dw/nimbu-toolbelt.svg)](https://npmjs.org/package/nimbu-toolbelt)
[![License](https://img.shields.io/npm/l/nimbu-toolbelt.svg)](https://github.com/zenjoy/nimbu-toolbelt/blob/master/package.json)

<!-- toc -->

- [Nimbu CLI](#nimbu-cli)
- [Usage](#usage)
  - [Prerequisites](#prerequisites)
  - [Getting started](#getting-started)
  - [Development server](#development-server)
  - [Pushing to nimbu](#pushing-to-nimbu)
- [Commands](#commands)
  - [`nimbu apps:config`](#nimbu-appsconfig)
  - [`nimbu apps:list`](#nimbu-appslist)
  - [`nimbu apps:push`](#nimbu-appspush)
  - [`nimbu apps:transpile`](#nimbu-appstranspile)
  - [`nimbu auth:login`](#nimbu-authlogin)
  - [`nimbu auth:logout`](#nimbu-authlogout)
  - [`nimbu auth:token`](#nimbu-authtoken)
  - [`nimbu auth:whoami`](#nimbu-authwhoami)
  - [`nimbu autocomplete [SHELL]`](#nimbu-autocomplete-shell)
  - [`nimbu browse:admin`](#nimbu-browseadmin)
  - [`nimbu browse:simulator`](#nimbu-browsesimulator)
  - [`nimbu channels:copy`](#nimbu-channelscopy)
  - [`nimbu channels:diff`](#nimbu-channelsdiff)
  - [`nimbu channels:entries:copy`](#nimbu-channelsentriescopy)
  - [`nimbu channels:info CHANNEL`](#nimbu-channelsinfo-channel)
  - [`nimbu commands`](#nimbu-commands)
  - [`nimbu config`](#nimbu-config)
  - [`nimbu customers:config:copy`](#nimbu-customersconfigcopy)
  - [`nimbu customers:config:diff`](#nimbu-customersconfigdiff)
  - [`nimbu customers:copy`](#nimbu-customerscopy)
  - [`nimbu help [COMMANDS]`](#nimbu-help-commands)
  - [`nimbu init`](#nimbu-init)
  - [`nimbu login`](#nimbu-login)
  - [`nimbu logout`](#nimbu-logout)
  - [`nimbu mails:pull`](#nimbu-mailspull)
  - [`nimbu mails:push`](#nimbu-mailspush)
  - [`nimbu menus:copy [SLUG]`](#nimbu-menuscopy-slug)
  - [`nimbu pages:copy [FULLPATH]`](#nimbu-pagescopy-fullpath)
  - [`nimbu plugins`](#nimbu-plugins)
  - [`nimbu plugins:install PLUGIN...`](#nimbu-pluginsinstall-plugin)
  - [`nimbu plugins:inspect PLUGIN...`](#nimbu-pluginsinspect-plugin)
  - [`nimbu plugins:install PLUGIN...`](#nimbu-pluginsinstall-plugin-1)
  - [`nimbu plugins:link PLUGIN`](#nimbu-pluginslink-plugin)
  - [`nimbu plugins:uninstall PLUGIN...`](#nimbu-pluginsuninstall-plugin)
  - [`nimbu plugins:reset`](#nimbu-pluginsreset)
  - [`nimbu plugins:uninstall PLUGIN...`](#nimbu-pluginsuninstall-plugin-1)
  - [`nimbu plugins:uninstall PLUGIN...`](#nimbu-pluginsuninstall-plugin-2)
  - [`nimbu plugins:update`](#nimbu-pluginsupdate)
  - [`nimbu products:config:copy`](#nimbu-productsconfigcopy)
  - [`nimbu products:config:diff`](#nimbu-productsconfigdiff)
  - [`nimbu sites`](#nimbu-sites)
  - [`nimbu sites:copy`](#nimbu-sitescopy)
  - [`nimbu sites:list`](#nimbu-siteslist)
  - [`nimbu themes:copy`](#nimbu-themescopy)
  - [`nimbu themes:diff [THEME]`](#nimbu-themesdiff-theme)
  - [`nimbu themes:list [THEME]`](#nimbu-themeslist-theme)
  - [`nimbu themes:pull`](#nimbu-themespull)
  - [`nimbu themes:push`](#nimbu-themespush)
  - [`nimbu translations:copy [QUERY]`](#nimbu-translationscopy-query)
  - [`nimbu update [CHANNEL]`](#nimbu-update-channel)
  - [`nimbu version`](#nimbu-version)
  - [`nimbu which`](#nimbu-which)
  - [`nimbu whoami`](#nimbu-whoami)
- [Features](#features)
  - [Coffeescript/Javascript](#coffeescriptjavascript)
  - [(S)CSS](#scss)
  - [Using the webpack output in your layout](#using-the-webpack-output-in-your-layout)
<!-- tocstop -->

# Usage

## Prerequisites

You need a recent `node` and `yarn`. On Mac OS X:

```
brew install node yarn
```

## Getting started

Add this package to your project:

```
yarn add --dev nimbu
```

## Development server

To start developing on your project that uses this toolbelt, just run:

```
yarn nimbu server
```

This will start a `webpack-dev-server`. Your browser should automatically open a connection to it at `http://localhost:4567/`.

## Pushing to nimbu

1. Stop your development server
2. Make a production build with `yarn nimbu build`
3. Push to nimbu with `yarn nimbu themes:push`

NOTE: Both the development and production webpack configuration generate
`snippets/webpack.liquid` that gives access to the information about which files
webpack generated. This should be included and used in the layout of your theme.
Make sure that include is there and that you push the snippet to nimbu!

# Commands

<!-- commands -->

- [Nimbu CLI](#nimbu-cli)
- [Usage](#usage)
  - [Prerequisites](#prerequisites)
  - [Getting started](#getting-started)
  - [Development server](#development-server)
  - [Pushing to nimbu](#pushing-to-nimbu)
- [Commands](#commands)
  - [`nimbu apps:config`](#nimbu-appsconfig)
  - [`nimbu apps:list`](#nimbu-appslist)
  - [`nimbu apps:push`](#nimbu-appspush)
  - [`nimbu apps:transpile`](#nimbu-appstranspile)
  - [`nimbu auth:login`](#nimbu-authlogin)
  - [`nimbu auth:logout`](#nimbu-authlogout)
  - [`nimbu auth:token`](#nimbu-authtoken)
  - [`nimbu auth:whoami`](#nimbu-authwhoami)
  - [`nimbu autocomplete [SHELL]`](#nimbu-autocomplete-shell)
  - [`nimbu browse:admin`](#nimbu-browseadmin)
  - [`nimbu browse:simulator`](#nimbu-browsesimulator)
  - [`nimbu channels:copy`](#nimbu-channelscopy)
  - [`nimbu channels:diff`](#nimbu-channelsdiff)
  - [`nimbu channels:entries:copy`](#nimbu-channelsentriescopy)
  - [`nimbu channels:info CHANNEL`](#nimbu-channelsinfo-channel)
  - [`nimbu commands`](#nimbu-commands)
  - [`nimbu config`](#nimbu-config)
  - [`nimbu customers:config:copy`](#nimbu-customersconfigcopy)
  - [`nimbu customers:config:diff`](#nimbu-customersconfigdiff)
  - [`nimbu customers:copy`](#nimbu-customerscopy)
  - [`nimbu help [COMMANDS]`](#nimbu-help-commands)
  - [`nimbu init`](#nimbu-init)
  - [`nimbu login`](#nimbu-login)
  - [`nimbu logout`](#nimbu-logout)
  - [`nimbu mails:pull`](#nimbu-mailspull)
  - [`nimbu mails:push`](#nimbu-mailspush)
  - [`nimbu menus:copy [SLUG]`](#nimbu-menuscopy-slug)
  - [`nimbu pages:copy [FULLPATH]`](#nimbu-pagescopy-fullpath)
  - [`nimbu plugins`](#nimbu-plugins)
  - [`nimbu plugins:install PLUGIN...`](#nimbu-pluginsinstall-plugin)
  - [`nimbu plugins:inspect PLUGIN...`](#nimbu-pluginsinspect-plugin)
  - [`nimbu plugins:install PLUGIN...`](#nimbu-pluginsinstall-plugin-1)
  - [`nimbu plugins:link PLUGIN`](#nimbu-pluginslink-plugin)
  - [`nimbu plugins:uninstall PLUGIN...`](#nimbu-pluginsuninstall-plugin)
  - [`nimbu plugins:reset`](#nimbu-pluginsreset)
  - [`nimbu plugins:uninstall PLUGIN...`](#nimbu-pluginsuninstall-plugin-1)
  - [`nimbu plugins:uninstall PLUGIN...`](#nimbu-pluginsuninstall-plugin-2)
  - [`nimbu plugins:update`](#nimbu-pluginsupdate)
  - [`nimbu products:config:copy`](#nimbu-productsconfigcopy)
  - [`nimbu products:config:diff`](#nimbu-productsconfigdiff)
  - [`nimbu sites`](#nimbu-sites)
  - [`nimbu sites:copy`](#nimbu-sitescopy)
  - [`nimbu sites:list`](#nimbu-siteslist)
  - [`nimbu themes:copy`](#nimbu-themescopy)
  - [`nimbu themes:diff [THEME]`](#nimbu-themesdiff-theme)
  - [`nimbu themes:list [THEME]`](#nimbu-themeslist-theme)
  - [`nimbu themes:pull`](#nimbu-themespull)
  - [`nimbu themes:push`](#nimbu-themespush)
  - [`nimbu translations:copy [QUERY]`](#nimbu-translationscopy-query)
  - [`nimbu update [CHANNEL]`](#nimbu-update-channel)
  - [`nimbu version`](#nimbu-version)
  - [`nimbu which`](#nimbu-which)
  - [`nimbu whoami`](#nimbu-whoami)
- [Features](#features)
  - [Coffeescript/Javascript](#coffeescriptjavascript)
  - [(S)CSS](#scss)
  - [Using the webpack output in your layout](#using-the-webpack-output-in-your-layout)

## `nimbu apps:config`

Add an app to the local configuration

```
USAGE
  $ nimbu apps:config

DESCRIPTION
  Add an app to the local configuration
```

_See code: [lib/commands/apps/config.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/apps/config.js)_

## `nimbu apps:list`

List the applications registered in Nimbu

```
USAGE
  $ nimbu apps:list

DESCRIPTION
  List the applications registered in Nimbu
```

_See code: [lib/commands/apps/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/apps/list.js)_

## `nimbu apps:push`

Push your cloud code files to nimbu

```
USAGE
  $ nimbu apps:push [-a <value>]

FLAGS
  -a, --app=<value>  The (local) name of the application to push to (see apps:list and apps:config).

DESCRIPTION
  Push your cloud code files to nimbu
```

_See code: [lib/commands/apps/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/apps/push.js)_

## `nimbu apps:transpile`

Transpile a file from ES6 to ES5 for compatiblity with legacy Nimbu Cloud engine

```
USAGE
  $ nimbu apps:transpile

DESCRIPTION
  Transpile a file from ES6 to ES5 for compatiblity with legacy Nimbu Cloud engine
```

_See code: [lib/commands/apps/transpile.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/apps/transpile.js)_

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

_See code: [lib/commands/auth/login.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/auth/login.js)_

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

_See code: [lib/commands/auth/logout.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/auth/logout.js)_

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

_See code: [lib/commands/auth/token.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/auth/token.js)_

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

_See code: [lib/commands/auth/whoami.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/auth/whoami.js)_

## `nimbu autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ nimbu autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ nimbu autocomplete

  $ nimbu autocomplete bash

  $ nimbu autocomplete zsh

  $ nimbu autocomplete powershell

  $ nimbu autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.0.5/src/commands/autocomplete/index.ts)_

## `nimbu browse:admin`

open the admin area for your current site

```
USAGE
  $ nimbu browse:admin

DESCRIPTION
  open the admin area for your current site
```

_See code: [lib/commands/browse/admin.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/browse/admin.js)_

## `nimbu browse:simulator`

open the simulator for your current site

```
USAGE
  $ nimbu browse:simulator

DESCRIPTION
  open the simulator for your current site
```

_See code: [lib/commands/browse/simulator.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/browse/simulator.js)_

## `nimbu channels:copy`

copy channel configuration from one to another

```
USAGE
  $ nimbu channels:copy -f <value> -t <value> [-a] [--force]

FLAGS
  -a, --all           copy all channels from source to target
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel
      --force         do not ask confirmation to overwrite existing channel

DESCRIPTION
  copy channel configuration from one to another
```

_See code: [lib/commands/channels/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/channels/copy.js)_

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

_See code: [lib/commands/channels/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/channels/diff.js)_

## `nimbu channels:entries:copy`

copy channel entries from one to another

```
USAGE
  $ nimbu channels:entries:copy -f <value> -t <value> [--allow-errors] [--copy-customers] [--dry-run] [--only <value>] [-p
    <value>] [-q <value>] [-r] [-u <value>] [-w <value>]

FLAGS
  -f, --from=<value>      (required) slug of the source channel
  -p, --per-page=<value>  number of entries to fetch per page
  -q, --query=<value>     query params to append to source channel api call
  -r, --recursive         automatically copy all dependent objects
  -t, --to=<value>        (required) slug of the target channel
  -u, --upsert=<value>    name of parameter to use for matching existing documents
  -w, --where=<value>     query expression to filter the source channel
      --allow-errors      do not stop when an item fails and continue with the other
      --copy-customers    copy and replicate all owners related to the objects we are copying
      --dry-run           log which translations would be copied without actually copying them
      --only=<value>      limit copy of channels to this list (comma-separated)

DESCRIPTION
  copy channel entries from one to another
```

_See code: [lib/commands/channels/entries/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/channels/entries/copy.js)_

## `nimbu channels:info CHANNEL`

list info about this channel

```
USAGE
  $ nimbu channels:info CHANNEL [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]]
    [--output csv|json|yaml|ts |  | ] [--sort <value>]

ARGUMENTS
  CHANNEL  slug of your channel (optionally with the site, i.e. site/channel)

FLAGS
  -x, --extended         show extra columns
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

_See code: [lib/commands/channels/info.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/channels/info.js)_

## `nimbu commands`

list all the commands

```
USAGE
  $ nimbu commands [--json] [--deprecated] [-h] [--hidden] [--tree] [--columns <value> | -x] [--filter
    <value>] [--no-header | [--csv | --no-truncate]] [--output csv|json|yaml |  | ] [--sort <value>]

FLAGS
  -h, --help             Show CLI help.
  -x, --extended         show extra columns
      --columns=<value>  only show provided columns (comma-separated)
      --csv              output is csv format [alias: --output=csv]
      --deprecated       show deprecated commands
      --filter=<value>   filter property by partial string matching, ex: name=foo
      --hidden           show hidden commands
      --no-header        hide table header from output
      --no-truncate      do not truncate output to fit screen
      --output=<option>  output in a more machine friendly format
                         <options: csv|json|yaml>
      --sort=<value>     property to sort by (prepend '-' for descending)
      --tree             show tree of commands

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  list all the commands
```

_See code: [@oclif/plugin-commands](https://github.com/oclif/plugin-commands/blob/v3.1.1/src/commands/commands.ts)_

## `nimbu config`

Show resolved configuration

```
USAGE
  $ nimbu config

DESCRIPTION
  Show resolved configuration
```

_See code: [lib/commands/config.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/config.js)_

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

_See code: [lib/commands/customers/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/customers/config/copy.js)_

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

_See code: [lib/commands/customers/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/customers/config/diff.js)_

## `nimbu customers:copy`

copy customers from one to another

```
USAGE
  $ nimbu customers:copy -f <value> -t <value> [--allow-errors] [-l <value>] [-p <value>] [-q <value>] [-u <value>]
    [-w <value>]

FLAGS
  -f, --from=<value>             (required) the source site
  -l, --password-length=<value>  [default: 12] length of the password generated for each new customer
  -p, --per-page=<value>         number of customers to fetch per page
  -q, --query=<value>            query params to append to source customer api call
  -t, --to=<value>               (required) the target site
  -u, --upsert=<value>           [default: email] name of parameter to use for matching existing customers
  -w, --where=<value>            query expression to filter the the source customer api call
      --allow-errors             do not stop when an item fails and continue with the other

DESCRIPTION
  copy customers from one to another
```

_See code: [lib/commands/customers/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/customers/copy.js)_

## `nimbu help [COMMANDS]`

Display help for nimbu.

```
USAGE
  $ nimbu help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for nimbu.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.12/src/commands/help.ts)_

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

_See code: [lib/commands/init/index.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/init/index.js)_

## `nimbu login`

login with your nimbu credentials

```
USAGE
  $ nimbu login [-e <value>]

FLAGS
  -e, --expires-in=<value>  duration of token in seconds (default 1 year)

DESCRIPTION
  login with your nimbu credentials

ALIASES
  $ nimbu login
```

## `nimbu logout`

clears local login credentials and invalidates API session

```
USAGE
  $ nimbu logout

DESCRIPTION
  clears local login credentials and invalidates API session

ALIASES
  $ nimbu logout
```

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

_See code: [lib/commands/mails/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/mails/pull.js)_

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

_See code: [lib/commands/mails/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/mails/push.js)_

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

_See code: [lib/commands/menus/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/menus/copy.js)_

## `nimbu pages:copy [FULLPATH]`

copy page from one site to another

```
USAGE
  $ nimbu pages:copy [FULLPATH] [-f <value>] [--fromHost <value>] [-t <value>] [--toHost <value>]

ARGUMENTS
  FULLPATH  [default: *] fullpath of pages to be copied

FLAGS
  -f, --from=<value>      subdomain of the source site
  -t, --to=<value>        subdomain of the destination site
      --fromHost=<value>  hostname of origin Nimbu API
      --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy page from one site to another
```

_See code: [lib/commands/pages/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/pages/copy.js)_

## `nimbu plugins`

List installed plugins.

```
USAGE
  $ nimbu plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ nimbu plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.21/src/commands/plugins/index.ts)_

## `nimbu plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ nimbu plugins:add plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

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
  $ nimbu plugins:add myplugin

  $ nimbu plugins:add https://github.com/someuser/someplugin

  $ nimbu plugins:add someuser/someplugin
```

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

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ nimbu plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.21/src/commands/plugins/inspect.ts)_

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
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.21/src/commands/plugins/install.ts)_

## `nimbu plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ nimbu plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ nimbu plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.21/src/commands/plugins/link.ts)_

## `nimbu plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ nimbu plugins:remove plugins:uninstall PLUGIN...

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

EXAMPLES
  $ nimbu plugins:remove myplugin
```

## `nimbu plugins:reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ nimbu plugins:reset
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.21/src/commands/plugins/reset.ts)_

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

EXAMPLES
  $ nimbu plugins:uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.21/src/commands/plugins/uninstall.ts)_

## `nimbu plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ nimbu plugins:unlink plugins:uninstall PLUGIN...

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

EXAMPLES
  $ nimbu plugins:unlink myplugin
```

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.21/src/commands/plugins/update.ts)_

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

_See code: [lib/commands/products/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/products/config/copy.js)_

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

_See code: [lib/commands/products/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/products/config/diff.js)_

## `nimbu sites`

list sites you can edit

```
USAGE
  $ nimbu sites [-s]

FLAGS
  -s, --subdomain  show Nimbu subdomain for each site

DESCRIPTION
  list sites you can edit

ALIASES
  $ nimbu sites
```

## `nimbu sites:copy`

copy a complete site from one to another

```
USAGE
  $ nimbu sites:copy [--allow-errors] [--copy-customers] [--force] [-f <value>] [-i <value>] [--only <value>]
    [--recursive] [-t <value>] [-u <value>]

FLAGS
  -f, --from=<value>     subdomain of the source site
  -i, --include=<value>  channels from which entities should be copied
  -t, --to=<value>       subdomain of the destination site
  -u, --upsert=<value>   name of parameter to use for matching existing documents
      --allow-errors     do not stop when an item fails and continue with the other
      --copy-customers   copy and replicate all owners related to the objects we are copying
      --force            do not ask confirmation to overwrite existing channel
      --only=<value>     limit copy of channels to this list (comma-separated) when using recursive
      --recursive        recursively copy child entities referenced by the entities to be copied

DESCRIPTION
  copy a complete site from one to another
```

_See code: [lib/commands/sites/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/sites/copy.js)_

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

_See code: [lib/commands/sites/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/sites/list.js)_

## `nimbu themes:copy`

copy themes from one site to another

```
USAGE
  $ nimbu themes:copy -f <value> -t <value> [--fromHost <value>] [--liquid-only] [--toHost <value>]

FLAGS
  -f, --from=<value>      (required) slug of the source theme
  -t, --to=<value>        (required) slug of the target theme
      --fromHost=<value>  hostname of origin Nimbu API
      --liquid-only       only copy the templates
      --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy themes from one site to another
```

_See code: [lib/commands/themes/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/themes/copy.js)_

## `nimbu themes:diff [THEME]`

show differences between local and server theme files

```
USAGE
  $ nimbu themes:diff [THEME] [-s <value>]

ARGUMENTS
  THEME  The name of the theme to compare

FLAGS
  -s, --site=<value>  the site of the theme

DESCRIPTION
  show differences between local and server theme files
```

_See code: [lib/commands/themes/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/themes/diff.js)_

## `nimbu themes:list [THEME]`

list all layouts, templates, snippets and assets

```
USAGE
  $ nimbu themes:list [THEME] [-s <value>]

ARGUMENTS
  THEME  The name of the theme to list

FLAGS
  -s, --site=<value>  the site of the theme

DESCRIPTION
  list all layouts, templates, snippets and assets
```

_See code: [lib/commands/themes/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/themes/list.js)_

## `nimbu themes:pull`

download all code and assets for a theme

```
USAGE
  $ nimbu themes:pull [--liquid-only] [-s <value>] [-t <value>]

FLAGS
  -s, --site=<value>   the site of the theme
  -t, --theme=<value>  [default: default-theme] slug of the theme
      --liquid-only    only download template files

DESCRIPTION
  download all code and assets for a theme
```

_See code: [lib/commands/themes/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/themes/pull.js)_

## `nimbu themes:push`

push the theme code online

```
USAGE
  $ nimbu themes:push [--css-only] [--fonts-only] [--images-only] [--js-only] [--liquid-only] [--only] [-s
    <value>]

FLAGS
  -s, --site=<value>  the site of the theme
      --css-only      only push css
      --fonts-only    only push fonts
      --images-only   only push new images
      --js-only       only push scripts
      --liquid-only   only push template code
      --only          only push the files given on the command line

DESCRIPTION
  push the theme code online
```

_See code: [lib/commands/themes/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/themes/push.js)_

## `nimbu translations:copy [QUERY]`

copy translations from one site to another

```
USAGE
  $ nimbu translations:copy [QUERY] [--dry-run] [-f <value>] [--fromHost <value>] [-s <value>] [-t <value>] [--toHost
    <value>]

ARGUMENTS
  QUERY  [default: *] query to match subset of translations to be copied

FLAGS
  -f, --from=<value>      subdomain of the source site
  -s, --since=<value>     copy translations updated since the given date (use ISO 8601 format or a time unit like 1d,
                          1w, 1m, 1y)
  -t, --to=<value>        subdomain of the destination site
      --dry-run           log which translations would be copied without actually copying them
      --fromHost=<value>  hostname of origin Nimbu API
      --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy translations from one site to another
```

_See code: [lib/commands/translations/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/translations/copy.js)_

## `nimbu update [CHANNEL]`

update the nimbu CLI

```
USAGE
  $ nimbu update [CHANNEL] [-a] [--force] [-i | -v <value>]

FLAGS
  -a, --available        See available versions.
  -i, --interactive      Interactively select version to install. This is ignored if a channel is provided.
  -v, --version=<value>  Install a specific version.
      --force            Force a re-download of the requested version.

DESCRIPTION
  update the nimbu CLI

EXAMPLES
  Update to the stable channel:

    $ nimbu update stable

  Update to a specific version:

    $ nimbu update --version 1.0.0

  Interactively select version:

    $ nimbu update --interactive

  See available versions:

    $ nimbu update --available
```

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v4.1.8/src/commands/update.ts)_

## `nimbu version`

```
USAGE
  $ nimbu version
```

_See code: [lib/commands/version.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.5.0/lib/commands/version.js)_

## `nimbu which`

Show which plugin a command is in.

```
USAGE
  $ nimbu which

DESCRIPTION
  Show which plugin a command is in.

EXAMPLES
  See which plugin the `help` command is in:

    $ nimbu which help
```

_See code: [@oclif/plugin-which](https://github.com/oclif/plugin-which/blob/v3.0.15/src/commands/which.ts)_

## `nimbu whoami`

display the current logged in user

```
USAGE
  $ nimbu whoami

DESCRIPTION
  display the current logged in user

ALIASES
  $ nimbu whoami
```

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
