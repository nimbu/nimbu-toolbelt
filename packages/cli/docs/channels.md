`nimbu channels`
================

working with channels

* [`nimbu channels:copy`](#nimbu-channelscopy)
* [`nimbu channels:diff`](#nimbu-channelsdiff)
* [`nimbu channels:entries:copy`](#nimbu-channelsentriescopy)

## `nimbu channels:copy`

copy channel configuration from one to another

```
USAGE
  $ nimbu channels:copy

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [lib/commands/channels/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/channels/copy.js)_

## `nimbu channels:diff`

check differences between channel settings from one to another

```
USAGE
  $ nimbu channels:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [lib/commands/channels/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/channels/diff.js)_

## `nimbu channels:entries:copy`

copy channel entries from one to another

```
USAGE
  $ nimbu channels:entries:copy

OPTIONS
  -f, --from=from          (required) slug of the source channel
  -p, --per_page=per_page  number of entries to fetch per page
  -q, --query=query        query params to apply to source channel
  -t, --to=to              (required) slug of the target channel
  -u, --upsert=upsert      name of parameter to use for matching existing documents
```

_See code: [lib/commands/channels/entries/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/channels/entries/copy.js)_
