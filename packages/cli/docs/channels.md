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
  -a, --all        copy all channels from source to target
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

## `nimbu channels:diff`

check differences between channel settings from one to another

```
USAGE
  $ nimbu channels:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

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
