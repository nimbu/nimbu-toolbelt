`nimbu apps`
============

manage (cloud code) applications

* [`nimbu apps:config`](#nimbu-appsconfig)
* [`nimbu apps:list`](#nimbu-appslist)
* [`nimbu apps:push [FILES]`](#nimbu-appspush-files)

## `nimbu apps:config`

Add an app to the local configuration

```
USAGE
  $ nimbu apps:config
```

_See code: [lib/commands/apps/config.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/apps/config.js)_

## `nimbu apps:list`

List the applications registered in Nimbu

```
USAGE
  $ nimbu apps:list
```

_See code: [lib/commands/apps/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/apps/list.js)_

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

_See code: [lib/commands/apps/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/apps/push.js)_
