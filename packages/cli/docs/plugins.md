# `nimbu plugins`

List installed plugins.

- [`nimbu plugins`](#nimbu-plugins)
- [`nimbu plugins:add PLUGIN`](#nimbu-pluginsadd-plugin)
- [`nimbu plugins:inspect PLUGIN...`](#nimbu-pluginsinspect-plugin)
- [`nimbu plugins:install PLUGIN`](#nimbu-pluginsinstall-plugin)
- [`nimbu plugins:link PATH`](#nimbu-pluginslink-path)
- [`nimbu plugins:remove [PLUGIN]`](#nimbu-pluginsremove-plugin)
- [`nimbu plugins:reset`](#nimbu-pluginsreset)
- [`nimbu plugins:uninstall [PLUGIN]`](#nimbu-pluginsuninstall-plugin)
- [`nimbu plugins:unlink [PLUGIN]`](#nimbu-pluginsunlink-plugin)
- [`nimbu plugins:update`](#nimbu-pluginsupdate)

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/index.ts)_

## `nimbu plugins:add PLUGIN`

Installs a plugin into nimbu.

```
USAGE
  $ nimbu plugins:add PLUGIN [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into nimbu.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the NIMBU_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the NIMBU_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ nimbu plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ nimbu plugins:add myplugin

  Install a plugin from a github url.

    $ nimbu plugins:add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/inspect.ts)_

## `nimbu plugins:install PLUGIN`

Installs a plugin into nimbu.

```
USAGE
  $ nimbu plugins:install PLUGIN [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into nimbu.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the NIMBU_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the NIMBU_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ nimbu plugins:add

EXAMPLES
  Install a plugin from npm registry.

    $ nimbu plugins:install myplugin

  Install a plugin from a github url.

    $ nimbu plugins:install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ nimbu plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/install.ts)_

## `nimbu plugins:link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ nimbu plugins:link PATH [-h] [--install] [-v]

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/link.ts)_

## `nimbu plugins:remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nimbu plugins:remove [PLUGIN] [-h] [-v]

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
  $ nimbu plugins:reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/reset.ts)_

## `nimbu plugins:uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nimbu plugins:uninstall [PLUGIN] [-h] [-v]

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/uninstall.ts)_

## `nimbu plugins:unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ nimbu plugins:unlink [PLUGIN] [-h] [-v]

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v5.4.47/src/commands/plugins/update.ts)_
