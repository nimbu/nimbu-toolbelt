`nimbu pages`
=============

copy page from one site to another

* [`nimbu pages:copy [FULLPATH]`](#nimbu-pagescopy-fullpath)

## `nimbu pages:copy [FULLPATH]`

copy page from one site to another

```
USAGE
  $ nimbu pages:copy [FULLPATH] [-f <value>] [--fromHost <value>] [-t <value>] [--toHost <value>]

ARGUMENTS
  FULLPATH  [default: *] fullpath of pages to be copied

FLAGS
  -f, --from=<value>      subdomain of the source site
  -t, --to=<value>        subdomain of the destination site
      --fromHost=<value>  hostname of origin Nimbu API
      --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy page from one site to another
```

_See code: [lib/commands/pages/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/pages/copy.js)_
