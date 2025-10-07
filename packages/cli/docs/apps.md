`nimbu apps`
============

manage (cloud code) applications

* [`nimbu apps:config`](#nimbu-appsconfig)
* [`nimbu apps:list`](#nimbu-appslist)
* [`nimbu apps:push`](#nimbu-appspush)
* [`nimbu apps:transpile`](#nimbu-appstranspile)

## `nimbu apps:config`

Add an app to the local configuration

```
USAGE
  $ nimbu apps:config

DESCRIPTION
  Add an app to the local configuration
```

_See code: [lib/commands/apps/config.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/apps/config.js)_

## `nimbu apps:list`

List the applications registered in Nimbu

```
USAGE
  $ nimbu apps:list

DESCRIPTION
  List the applications registered in Nimbu
```

_See code: [lib/commands/apps/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/apps/list.js)_

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

_See code: [lib/commands/apps/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/apps/push.js)_

## `nimbu apps:transpile`

Transpile a file from ES6 to ES5 for compatiblity with legacy Nimbu Cloud engine

```
USAGE
  $ nimbu apps:transpile

DESCRIPTION
  Transpile a file from ES6 to ES5 for compatiblity with legacy Nimbu Cloud engine
```

_See code: [lib/commands/apps/transpile.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/apps/transpile.js)_
