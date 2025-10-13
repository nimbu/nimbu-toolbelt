`nimbu themes`
==============

working with themes (upload / download)

* [`nimbu themes:copy`](#nimbu-themescopy)
* [`nimbu themes:diff [THEME]`](#nimbu-themesdiff-theme)
* [`nimbu themes:list [THEME]`](#nimbu-themeslist-theme)
* [`nimbu themes:pull`](#nimbu-themespull)
* [`nimbu themes:push`](#nimbu-themespush)

## `nimbu themes:copy`

copy themes from one site to another

```
USAGE
  $ nimbu themes:copy -f <value> -t <value> [--fromHost <value>] [--liquid-only] [--toHost <value>]

FLAGS
  -f, --from=<value>      (required) slug of the source theme
  -t, --to=<value>        (required) slug of the target theme
      --fromHost=<value>  hostname of origin Nimbu API
      --liquid-only       only copy the templates
      --toHost=<value>    hostname of target Nimbu API

DESCRIPTION
  copy themes from one site to another
```

_See code: [lib/commands/themes/copy.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/themes/copy.js)_

## `nimbu themes:diff [THEME]`

show differences between local and server theme files

```
USAGE
  $ nimbu themes:diff [THEME] [-s <value>]

ARGUMENTS
  THEME  The name of the theme to compare

FLAGS
  -s, --site=<value>  the site of the theme

DESCRIPTION
  show differences between local and server theme files
```

_See code: [lib/commands/themes/diff.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/themes/diff.js)_

## `nimbu themes:list [THEME]`

list all layouts, templates, snippets and assets

```
USAGE
  $ nimbu themes:list [THEME] [-s <value>]

ARGUMENTS
  THEME  The name of the theme to list

FLAGS
  -s, --site=<value>  the site of the theme

DESCRIPTION
  list all layouts, templates, snippets and assets
```

_See code: [lib/commands/themes/list.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/themes/list.js)_

## `nimbu themes:pull`

download all code and assets for a theme

```
USAGE
  $ nimbu themes:pull [--liquid-only] [-s <value>] [-t <value>]

FLAGS
  -s, --site=<value>   the site of the theme
  -t, --theme=<value>  [default: default-theme] slug of the theme
      --liquid-only    only download template files

DESCRIPTION
  download all code and assets for a theme
```

_See code: [lib/commands/themes/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/themes/pull.js)_

## `nimbu themes:push`

push the theme code online

```
USAGE
  $ nimbu themes:push [--css-only] [--fonts-only] [--images-only] [--js-only] [--liquid-only] [--only] [-s
    <value>]

FLAGS
  -s, --site=<value>  the site of the theme
      --css-only      only push css
      --fonts-only    only push fonts
      --images-only   only push new images
      --js-only       only push scripts
      --liquid-only   only push template code
      --only          only push the files given on the command line

DESCRIPTION
  push the theme code online
```

_See code: [lib/commands/themes/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0-alpha.0/lib/commands/themes/push.js)_
