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
$ npm install -g @nimbu-cli/plugin-webpack-v4
$ nimbu COMMAND
running command...
$ nimbu (-v|--version|version)
@nimbu-cli/plugin-webpack-v4/5.0.0-alpha.0 darwin-x64 node-v14.17.5
$ nimbu --help [COMMAND]
USAGE
  $ nimbu COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`nimbu apps:transpile SOURCE TARGET`](#nimbu-appstranspile-source-target)
* [`nimbu build`](#nimbu-build)
* [`nimbu hello [FILE]`](#nimbu-hello-file)
* [`nimbu server`](#nimbu-server)
* [`nimbu themes:diff [THEME]`](#nimbu-themesdiff-theme)
* [`nimbu themes:list [THEME]`](#nimbu-themeslist-theme)
* [`nimbu themes:push [FILES]`](#nimbu-themespush-files)

## `nimbu apps:transpile SOURCE TARGET`

Transpile a file from ES6 to ES5 for compatiblity with Nimbu Cloud applications

```
USAGE
  $ nimbu apps:transpile SOURCE TARGET
```

_See code: [lib/commands/apps/transpile.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/apps/transpile.js)_

## `nimbu build`

build a production version of your javascript and CSS

```
USAGE
  $ nimbu build
```

_See code: [lib/commands/build.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/build.js)_

## `nimbu hello [FILE]`

describe the command here

```
USAGE
  $ nimbu hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ oclif-example hello
  hello world from ./src/hello.ts!
```

_See code: [lib/commands/hello.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/hello.js)_

## `nimbu server`

run the development server

```
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

_See code: [lib/commands/server.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/server.js)_

## `nimbu themes:diff [THEME]`

describe the command here

```
USAGE
  $ nimbu themes:diff [THEME]

ARGUMENTS
  THEME  The name of the theme to list
```

_See code: [lib/commands/themes/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/themes/diff.js)_

## `nimbu themes:list [THEME]`

list all layouts, templates and assets

```
USAGE
  $ nimbu themes:list [THEME]

ARGUMENTS
  THEME  The name of the theme to list
```

_See code: [lib/commands/themes/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/themes/list.js)_

## `nimbu themes:push [FILES]`

push the theme code online

```
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

_See code: [lib/commands/themes/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/themes/push.js)_
<!-- commandsstop -->
