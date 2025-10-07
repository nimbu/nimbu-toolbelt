`nimbu autocomplete`
====================

Display autocomplete installation instructions.

* [`nimbu autocomplete [SHELL]`](#nimbu-autocomplete-shell)

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

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.34/src/commands/autocomplete/index.ts)_
