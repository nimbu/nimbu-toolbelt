`nimbu channels`
================

working with channels

* [`nimbu channels:copy`](#nimbu-channelscopy)
* [`nimbu channels:diff`](#nimbu-channelsdiff)
* [`nimbu channels:entries:copy`](#nimbu-channelsentriescopy)
* [`nimbu channels:info CHANNEL`](#nimbu-channelsinfo-channel)

## `nimbu channels:copy`

copy channel configuration from one to another

```
USAGE
  $ nimbu channels:copy -f <value> -t <value> [-a] [--force]

FLAGS
  -a, --all           copy all channels from source to target
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel
      --force         do not ask confirmation to overwrite existing channel

DESCRIPTION
  copy channel configuration from one to another
```

_See code: [lib/commands/channels/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/channels/copy.js)_

## `nimbu channels:diff`

check differences between channel settings from one to another

```
USAGE
  $ nimbu channels:diff -f <value> -t <value>

FLAGS
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel

DESCRIPTION
  check differences between channel settings from one to another
```

_See code: [lib/commands/channels/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/channels/diff.js)_

## `nimbu channels:entries:copy`

copy channel entries from one to another

```
USAGE
  $ nimbu channels:entries:copy -f <value> -t <value> [--allow-errors] [--copy-customers] [--dry-run] [--only <value>] [-p
    <value>] [-q <value>] [-r] [-u <value>] [-w <value>]

FLAGS
  -f, --from=<value>      (required) slug of the source channel
  -p, --per-page=<value>  number of entries to fetch per page
  -q, --query=<value>     query params to append to source channel api call
  -r, --recursive         automatically copy all dependent objects
  -t, --to=<value>        (required) slug of the target channel
  -u, --upsert=<value>    name of parameter to use for matching existing documents
  -w, --where=<value>     query expression to filter the source channel
      --allow-errors      do not stop when an item fails and continue with the other
      --copy-customers    copy and replicate all owners related to the objects we are copying
      --dry-run           log which translations would be copied without actually copying them
      --only=<value>      limit copy of channels to this list (comma-separated)

DESCRIPTION
  copy channel entries from one to another
```

_See code: [lib/commands/channels/entries/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/channels/entries/copy.js)_

## `nimbu channels:info CHANNEL`

list info about this channel

```
USAGE
  $ nimbu channels:info CHANNEL [--columns <value> | -x] [--filter <value>] [--no-header | [--csv | --no-truncate]]
    [--output csv|json|yaml|ts |  | ] [--sort <value>]

ARGUMENTS
  CHANNEL  slug of your channel (optionally with the site, i.e. site/channel)

FLAGS
  -x, --extended         show extra columns
      --columns=<value>  only show provided columns (comma-separated)
      --csv              output is csv format [alias: --output=csv]
      --filter=<value>   filter property by partial string matching, ex: name=foo
      --no-header        hide table header from output
      --no-truncate      do not truncate output to fit screen
      --output=<option>  output in a more machine friendly format
                         <options: csv|json|yaml|ts>
      --sort=<value>     property to sort by (prepend '-' for descending)

DESCRIPTION
  list info about this channel
```

_See code: [lib/commands/channels/info.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/channels/info.js)_
