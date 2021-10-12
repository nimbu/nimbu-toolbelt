`nimbu pages`
=============

copy page from one site to another

* [`nimbu pages:copy [FULLPATH]`](#nimbu-pagescopy-fullpath)

## `nimbu pages:copy [FULLPATH]`

copy page from one site to another

```
USAGE
  $ nimbu pages:copy [FULLPATH]

ARGUMENTS
  FULLPATH  [default: *] fullpath of pages to be copied

OPTIONS
  -f, --from=from      subdomain of the source site
  -t, --to=to          subdomain of the destination site
  --fromHost=fromHost  hostname of origin Nimbu API
  --toHost=toHost      hostname of target Nimbu API
```

_See code: [lib/commands/pages/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.0/lib/commands/pages/copy.js)_
