# @nimbu/webpack

Webpack Plugin for the Nimbu toolbelt

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@nimbu/webpack.svg)](https://npmjs.org/package/@nimbu/webpack)
[![Downloads/week](https://img.shields.io/npm/dw/@nimbu/webpack.svg)](https://npmjs.org/package/@nimbu/webpack)
[![License](https://img.shields.io/npm/l/@nimbu/webpack.svg)](https://github.com/dedene/webpack/blob/master/package.json)

<!-- toc -->
* [@nimbu/webpack](#nimbuwebpack)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @nimbu-cli/plugin-webpack-v5
$ @nimbu-cli/plugin-webpack-v5 COMMAND
running command...
$ @nimbu-cli/plugin-webpack-v5 (--version)
@nimbu-cli/plugin-webpack-v5/6.0.0-alpha.0 darwin-arm64 node-v24.10.0
$ @nimbu-cli/plugin-webpack-v5 --help [COMMAND]
USAGE
  $ @nimbu-cli/plugin-webpack-v5 COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`@nimbu-cli/plugin-webpack-v5 build`](#nimbu-cliplugin-webpack-v5-build)
* [`@nimbu-cli/plugin-webpack-v5 build:v5`](#nimbu-cliplugin-webpack-v5-buildv5)
* [`@nimbu-cli/plugin-webpack-v5 server`](#nimbu-cliplugin-webpack-v5-server)
* [`@nimbu-cli/plugin-webpack-v5 server:v5`](#nimbu-cliplugin-webpack-v5-serverv5)

## `@nimbu-cli/plugin-webpack-v5 build`

build a production bundle of your JS and CSS (using webpack 5)

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 build [--stats]

FLAGS
  --stats  Write bundle-stats.json file with detailed build info

DESCRIPTION
  build a production bundle of your JS and CSS (using webpack 5)

ALIASES
  $ @nimbu-cli/plugin-webpack-v5 build:v5
```

_See code: [src/commands/build.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/src/commands/build.ts)_

## `@nimbu-cli/plugin-webpack-v5 build:v5`

build a production bundle of your JS and CSS (using webpack 5)

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 build:v5 [--stats]

FLAGS
  --stats  Write bundle-stats.json file with detailed build info

DESCRIPTION
  build a production bundle of your JS and CSS (using webpack 5)

ALIASES
  $ @nimbu-cli/plugin-webpack-v5 build:v5
```

## `@nimbu-cli/plugin-webpack-v5 server`

run the development server (webpack 5)

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 server [--debug] [--dual-server] [--host <value>] [--nimbu-port <value>]
    [--noopen] [--nowebpack] [--poll] [--port <value>]

FLAGS
  --debug               Enable debug logging for API requests (excludes template code for readability)
  --dual-server         Use legacy dual-server mode (webpack + separate proxy server)
  --host=<value>        The hostname/ip-address to bind on.
  --nimbu-port=<value>  [default: 4568] The port for the nimbu proxy server to listen on.
  --noopen              Don't open/reload browser
  --nowebpack           Do not use webpack.
  --poll                Tell webpack dev server to use polling
  --port=<value>        [default: 4567] The port to listen on.

DESCRIPTION
  run the development server (webpack 5)

ALIASES
  $ @nimbu-cli/plugin-webpack-v5 server:v5
```

_See code: [src/commands/server.ts](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/src/commands/server.ts)_

## `@nimbu-cli/plugin-webpack-v5 server:v5`

run the development server (webpack 5)

```
USAGE
  $ @nimbu-cli/plugin-webpack-v5 server:v5 [--debug] [--dual-server] [--host <value>] [--nimbu-port <value>]
    [--noopen] [--nowebpack] [--poll] [--port <value>]

FLAGS
  --debug               Enable debug logging for API requests (excludes template code for readability)
  --dual-server         Use legacy dual-server mode (webpack + separate proxy server)
  --host=<value>        The hostname/ip-address to bind on.
  --nimbu-port=<value>  [default: 4568] The port for the nimbu proxy server to listen on.
  --noopen              Don't open/reload browser
  --nowebpack           Do not use webpack.
  --poll                Tell webpack dev server to use polling
  --port=<value>        [default: 4567] The port to listen on.

DESCRIPTION
  run the development server (webpack 5)

ALIASES
  $ @nimbu-cli/plugin-webpack-v5 server:v5
```
<!-- commandsstop -->
