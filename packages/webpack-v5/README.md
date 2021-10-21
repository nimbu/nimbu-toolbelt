@nimbu/webpack
==============

Webpack Plugin for the Nimbu toolbelt

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@nimbu/webpack.svg)](https://npmjs.org/package/@nimbu/webpack)
[![Downloads/week](https://img.shields.io/npm/dw/@nimbu/webpack.svg)](https://npmjs.org/package/@nimbu/webpack)
[![License](https://img.shields.io/npm/l/@nimbu/webpack.svg)](https://github.com/dedene/webpack/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g @nimbu-cli/plugin-webpack-v5
$ @nimbu-cli/plugin-webpack-v5 COMMAND
running command...
$ @nimbu-cli/plugin-webpack-v5 (-v|--version|version)
@nimbu-cli/plugin-webpack-v5/5.0.0-alpha.7 darwin-x64 node-v14.17.5
$ @nimbu-cli/plugin-webpack-v5 --help [COMMAND]
USAGE
  $ @nimbu-cli/plugin-webpack-v5 COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`@nimbu-cli/plugin-webpack-v5 apps:transpile SOURCE TARGET`](#nimbu-cliplugin-webpack-v5-appstranspile-source-target)
* [`@nimbu-cli/plugin-webpack-v5 build`](#nimbu-cliplugin-webpack-v5-build)
* [`@nimbu-cli/plugin-webpack-v5 server`](#nimbu-cliplugin-webpack-v5-server)
* [`@nimbu-cli/plugin-webpack-v5 themes:diff [THEME]`](#nimbu-cliplugin-webpack-v5-themesdiff-theme)
* [`@nimbu-cli/plugin-webpack-v5 themes:list [THEME]`](#nimbu-cliplugin-webpack-v5-themeslist-theme)
* [`@nimbu-cli/plugin-webpack-v5 themes:push [FILES]`](#nimbu-cliplugin-webpack-v5-themespush-files)

## `@nimbu-cli/plugin-webpack-v5 apps:transpile SOURCE TARGET`

Transpile a file from ES6 to ES5 for compatiblity with Nimbu Cloud applications

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 apps:transpile SOURCE TARGET
```

_See code: [src/commands/apps/transpile.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/src/commands/apps/transpile.ts)_

## `@nimbu-cli/plugin-webpack-v5 build`

build a production version of your javascript and CSS

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 build
```

_See code: [src/commands/build.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/src/commands/build.ts)_

## `@nimbu-cli/plugin-webpack-v5 server`

run the development server (webpack 5)

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 server

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

_See code: [src/commands/server.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/src/commands/server.ts)_

## `@nimbu-cli/plugin-webpack-v5 themes:diff [THEME]`

describe the command here

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 themes:diff [THEME]

ARGUMENTS
  THEME  The name of the theme to list
```

_See code: [src/commands/themes/diff.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/src/commands/themes/diff.ts)_

## `@nimbu-cli/plugin-webpack-v5 themes:list [THEME]`

list all layouts, templates and assets

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 themes:list [THEME]

ARGUMENTS
  THEME  The name of the theme to list
```

_See code: [src/commands/themes/list.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/src/commands/themes/list.ts)_

## `@nimbu-cli/plugin-webpack-v5 themes:push [FILES]`

push the theme code online

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 themes:push [FILES]

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

_See code: [src/commands/themes/push.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/src/commands/themes/push.ts)_
<!-- commandsstop -->
