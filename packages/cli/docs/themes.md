`nimbu themes`
==============

working with themes (upload / download)

* [`nimbu themes:copy`](#nimbu-themescopy)
* [`nimbu themes:pull`](#nimbu-themespull)

## `nimbu themes:copy`

copy themes from one site to another

```
USAGE
  $ nimbu themes:copy

OPTIONS
  -f, --from=from      (required) slug of the source theme
  -t, --to=to          (required) slug of the target theme
  --fromHost=fromHost  hostname of origin Nimbu API
  --liquid-only        only copy the templates
  --toHost=toHost      hostname of target Nimbu API
```

_See code: [lib/commands/themes/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/themes/copy.js)_

## `nimbu themes:pull`

download all code and assets for a theme

```
USAGE
  $ nimbu themes:pull

OPTIONS
  -s, --site=site    the site of the theme
  -t, --theme=theme  [default: default-theme] slug of the theme
  --liquid-only      only download template files
```

_See code: [lib/commands/themes/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/themes/pull.js)_
