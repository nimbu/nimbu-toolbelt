`nimbu sites`
=============

interacting with your sites (list, create)

* [`nimbu sites`](#nimbu-sites)
* [`nimbu sites:copy`](#nimbu-sitescopy)
* [`nimbu sites:list`](#nimbu-siteslist)

## `nimbu sites`

list sites you can edit

```
USAGE
  $ nimbu sites [-s]

FLAGS
  -s, --subdomain  show Nimbu subdomain for each site

DESCRIPTION
  list sites you can edit

ALIASES
  $ nimbu sites
```

## `nimbu sites:copy`

copy a complete site from one to another

```
USAGE
  $ nimbu sites:copy [--allow-errors] [--copy-customers] [--force] [-f <value>] [-i <value>] [--only <value>]
    [--recursive] [-t <value>] [-u <value>]

FLAGS
  -f, --from=<value>     subdomain of the source site
  -i, --include=<value>  channels from which entities should be copied
  -t, --to=<value>       subdomain of the destination site
  -u, --upsert=<value>   name of parameter to use for matching existing documents
      --allow-errors     do not stop when an item fails and continue with the other
      --copy-customers   copy and replicate all owners related to the objects we are copying
      --force            do not ask confirmation to overwrite existing channel
      --only=<value>     limit copy of channels to this list (comma-separated) when using recursive
      --recursive        recursively copy child entities referenced by the entities to be copied

DESCRIPTION
  copy a complete site from one to another
```

_See code: [lib/commands/sites/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/sites/copy.js)_

## `nimbu sites:list`

list sites you can edit

```
USAGE
  $ nimbu sites:list [-s]

FLAGS
  -s, --subdomain  show Nimbu subdomain for each site

DESCRIPTION
  list sites you can edit

ALIASES
  $ nimbu sites
```

_See code: [lib/commands/sites/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/sites/list.js)_
