# `nimbu mails`

manage your notification templates

- [`nimbu mails:pull`](#nimbu-mailspull)
- [`nimbu mails:push`](#nimbu-mailspush)

## `nimbu mails:pull`

download all notification templates

```
USAGE
  $ nimbu mails:pull [-o <value>]

FLAGS
  -o, --only=<value>...  the names of the templates to pull from Nimbu

DESCRIPTION
  download all notification templates
```

_See code: [lib/commands/mails/pull.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/mails/pull.js)_

## `nimbu mails:push`

upload all notification templates

```
USAGE
  $ nimbu mails:push [-o <value>]

FLAGS
  -o, --only=<value>...  the names of the templates to push online

DESCRIPTION
  upload all notification templates
```

_See code: [lib/commands/mails/push.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v6.0.0/lib/commands/mails/push.js)_
