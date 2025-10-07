`nimbu products`
================

working with products

* [`nimbu products:config:copy`](#nimbu-productsconfigcopy)
* [`nimbu products:config:diff`](#nimbu-productsconfigdiff)

## `nimbu products:config:copy`

copy product customizations from one to another

```
USAGE
  $ nimbu products:config:copy [-f <value>] [-t <value>]

FLAGS
  -f, --from=<value>  subdomain of the source site
  -t, --to=<value>    subdomain of the destination site

DESCRIPTION
  copy product customizations from one to another
```

_See code: [lib/commands/products/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/products/config/copy.js)_

## `nimbu products:config:diff`

check differences between product customizations from one to another

```
USAGE
  $ nimbu products:config:diff -f <value> -t <value>

FLAGS
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel

DESCRIPTION
  check differences between product customizations from one to another
```

_See code: [lib/commands/products/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/products/config/diff.js)_
