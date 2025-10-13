`nimbu which`
=============

Show which plugin a command is in.

* [`nimbu which`](#nimbu-which)

## `nimbu which`

Show which plugin a command is in.

```
USAGE
  $ nimbu which [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show which plugin a command is in.

EXAMPLES
  See which plugin the `help` command is in:

    $ nimbu which help

  Use colon separators.

    $ nimbu which foo:bar:baz

  Use spaces as separators.

    $ nimbu which foo bar baz

  Wrap command in quotes to use spaces as separators.

    $ nimbu which "foo bar baz"
```

_See code: [@oclif/plugin-which](https://github.com/oclif/plugin-which/blob/v3.2.40/src/commands/which.ts)_
