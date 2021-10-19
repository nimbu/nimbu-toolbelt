`nimbu sites`
=============

interacting with your sites (list, create)

* [`nimbu sites:copy`](#nimbu-sitescopy)
* [`nimbu sites:list`](#nimbu-siteslist)

## `nimbu sites:copy`

copy a complete site from one to another

```
USAGE
  $ nimbu sites:copy

OPTIONS
  -f, --from=from  subdomain of the source site
  -t, --to=to      subdomain of the destination site
  --force          do not ask confirmation to overwrite existing channel
```

_See code: [lib/commands/sites/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.5/lib/commands/sites/copy.js)_

## `nimbu sites:list`

list sites you can edit

```
USAGE
  $ nimbu sites:list

OPTIONS
  -s, --subdomain  show Nimbu subdomain for each site

ALIASES
  $ nimbu sites
```

_See code: [lib/commands/sites/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.5/lib/commands/sites/list.js)_
