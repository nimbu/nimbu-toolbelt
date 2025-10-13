`nimbu update`
==============

update the nimbu CLI

* [`nimbu update [CHANNEL]`](#nimbu-update-channel)

## `nimbu update [CHANNEL]`

update the nimbu CLI

```
USAGE
  $ nimbu update [CHANNEL] [--force |  | [-a | -v <value> | -i]] [-b ]

FLAGS
  -a, --available        See available versions.
  -b, --verbose          Show more details about the available versions.
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

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v4.7.8/src/commands/update.ts)_
