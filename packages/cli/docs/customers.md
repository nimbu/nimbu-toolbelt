`nimbu customers`
=================

working with customers

* [`nimbu customers:config:copy`](#nimbu-customersconfigcopy)
* [`nimbu customers:config:diff`](#nimbu-customersconfigdiff)

## `nimbu customers:config:copy`

copy customer customizations from one to another

```
USAGE
  $ nimbu customers:config:copy

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
```

_See code: [lib/commands/customers/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.5/lib/commands/customers/config/copy.js)_

## `nimbu customers:config:diff`

check differences between customer customizations from one to another

```
USAGE
  $ nimbu customers:config:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [lib/commands/customers/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.5/lib/commands/customers/config/diff.js)_
