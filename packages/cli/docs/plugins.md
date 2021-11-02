`nimbu plugins`
===============

list installed plugins

* [`nimbu plugins`](#nimbu-plugins)
* [`nimbu plugins:inspect PLUGIN...`](#nimbu-pluginsinspect-plugin)
* [`nimbu plugins:install PLUGIN...`](#nimbu-pluginsinstall-plugin)
* [`nimbu plugins:link PLUGIN`](#nimbu-pluginslink-plugin)
* [`nimbu plugins:uninstall PLUGIN...`](#nimbu-pluginsuninstall-plugin)
* [`nimbu plugins:update`](#nimbu-pluginsupdate)

## `nimbu plugins`

list installed plugins

```
USAGE
  $ nimbu plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ nimbu plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.1/src/commands/plugins/index.ts)_

## `nimbu plugins:inspect PLUGIN...`

displays installation properties of a plugin

```
USAGE
  $ nimbu plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] plugin to inspect

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

EXAMPLE
  $ nimbu plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.1/src/commands/plugins/inspect.ts)_

## `nimbu plugins:install PLUGIN...`

installs a plugin into the CLI

```
USAGE
  $ nimbu plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  plugin to install

OPTIONS
  -f, --force    yarn install with force flag
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.1/src/commands/plugins/install.ts)_

## `nimbu plugins:link PLUGIN`

links a plugin into the CLI for development

```
USAGE
  $ nimbu plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' 
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLE
  $ nimbu plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.1/src/commands/plugins/link.ts)_

## `nimbu plugins:uninstall PLUGIN...`

removes a plugin from the CLI

```
USAGE
  $ nimbu plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

ALIASES
  $ nimbu plugins:unlink
  $ nimbu plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.1/src/commands/plugins/uninstall.ts)_

## `nimbu plugins:update`

update installed plugins

```
USAGE
  $ nimbu plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.1/src/commands/plugins/update.ts)_
