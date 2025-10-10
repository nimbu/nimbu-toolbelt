# `nimbu customers`

working with customers

- [`nimbu customers:config:copy`](#nimbu-customersconfigcopy)
- [`nimbu customers:config:diff`](#nimbu-customersconfigdiff)
- [`nimbu customers:copy`](#nimbu-customerscopy)

## `nimbu customers:config:copy`

copy customer customizations from one to another

```
USAGE
  $ nimbu customers:config:copy [-f <value>] [-t <value>]

FLAGS
  -f, --from=<value>  subdomain of the source site
  -t, --to=<value>    subdomain of the destination site

DESCRIPTION
  copy customer customizations from one to another
```

_See code: [lib/commands/customers/config/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/customers/config/copy.js)_

## `nimbu customers:config:diff`

check differences between customer customizations from one to another

```
USAGE
  $ nimbu customers:config:diff -f <value> -t <value>

FLAGS
  -f, --from=<value>  (required) slug of the source channel
  -t, --to=<value>    (required) slug of the target channel

DESCRIPTION
  check differences between customer customizations from one to another
```

_See code: [lib/commands/customers/config/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/customers/config/diff.js)_

## `nimbu customers:copy`

copy customers from one to another

```
USAGE
  $ nimbu customers:copy -f <value> -t <value> [--allow-errors] [-l <value>] [-p <value>] [-q <value>] [-u <value>]
    [-w <value>]

FLAGS
  -f, --from=<value>             (required) the source site
  -l, --password-length=<value>  [default: 12] length of the password generated for each new customer
  -p, --per-page=<value>         number of customers to fetch per page
  -q, --query=<value>            query params to append to source customer api call
  -t, --to=<value>               (required) the target site
  -u, --upsert=<value>           [default: email] name of parameter to use for matching existing customers
  -w, --where=<value>            query expression to filter the the source customer api call
      --allow-errors             do not stop when an item fails and continue with the other

DESCRIPTION
  copy customers from one to another
```

_See code: [lib/commands/customers/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/customers/copy.js)_
