`nimbu translations`
====================

working with translations

* [`nimbu translations:copy [QUERY]`](#nimbu-translationscopy-query)

## `nimbu translations:copy [QUERY]`

copy translations from one site to another

```
USAGE
  $ nimbu translations:copy [QUERY]

ARGUMENTS
  QUERY  [default: *] query to match subset of translations to be copied

OPTIONS
  -f, --from=from      subdomain of the source site
  -t, --to=to          subdomain of the destination site
  --fromHost=fromHost  hostname of origin Nimbu API
  --toHost=toHost      hostname of target Nimbu API
```

_See code: [lib/commands/translations/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/translations/copy.js)_
