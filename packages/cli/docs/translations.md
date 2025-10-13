`nimbu translations`
====================

working with translations

* [`nimbu translations:copy [QUERY]`](#nimbu-translationscopy-query)

## `nimbu translations:copy [QUERY]`

copy translations from one site to another

```
USAGE
  $ nimbu translations:copy [QUERY] [--dry-run] [-f <value>] [--fromHost <value>] [-s <value>] [-t <value>] [--toHost
    <value>]

ARGUMENTS
  QUERY  [default: *] query to match subset of translations to be copied

FLAGS
  -f, --from=<value>      subdomain of the source site
  -s, --since=<value>     copy translations updated since the given date (use ISO 8601 format or a time unit like 1d,
                          1w, 1m, 1y)
  -t, --to=<value>        subdomain of the destination site
      --dry-run           log which translations would be copied without actually copying them
      --fromHost=<value>  hostname of origin Nimbu API
      --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy translations from one site to another
```

_See code: [lib/commands/translations/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/translations/copy.js)_
