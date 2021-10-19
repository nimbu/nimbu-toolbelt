`nimbu products`
================

working with products

* [`nimbu products:config:copy`](#nimbu-productsconfigcopy)
* [`nimbu products:config:diff`](#nimbu-productsconfigdiff)

## `nimbu products:config:copy`

copy product customizations from one to another

```
USAGE
  $ nimbu products:config:copy

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
```

_See code: [lib/commands/products/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.5/lib/commands/products/config/copy.js)_

## `nimbu products:config:diff`

check differences between product customizations from one to another

```
USAGE
  $ nimbu products:config:diff

OPTIONS
  -f, --from=from  (required) slug of the source channel
  -t, --to=to      (required) slug of the target channel
```

_See code: [lib/commands/products/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.5/lib/commands/products/config/diff.js)_
