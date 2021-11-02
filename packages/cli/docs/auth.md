`nimbu auth`
============

authenticate, display token and current user

* [`nimbu auth:login`](#nimbu-authlogin)
* [`nimbu auth:logout`](#nimbu-authlogout)
* [`nimbu auth:token`](#nimbu-authtoken)
* [`nimbu auth:whoami`](#nimbu-authwhoami)

## `nimbu auth:login`

login with your nimbu credentials

```
USAGE
  $ nimbu auth:login

OPTIONS
  -e, --expires-in=expires-in  duration of token in seconds (default 1 year)

ALIASES
  $ nimbu login
```

_See code: [lib/commands/auth/login.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/auth/login.js)_

## `nimbu auth:logout`

clears local login credentials and invalidates API session

```
USAGE
  $ nimbu auth:logout

ALIASES
  $ nimbu logout
```

_See code: [lib/commands/auth/logout.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/auth/logout.js)_

## `nimbu auth:token`

outputs current CLI authentication token.

```
USAGE
  $ nimbu auth:token

OPTIONS
  -h, --help  show CLI help

DESCRIPTION
  By default, the CLI auth token is only valid for 1 year. To generate a long-lived token, use nimbu 
  authorizations:create
```

_See code: [lib/commands/auth/token.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/auth/token.js)_

## `nimbu auth:whoami`

display the current logged in user

```
USAGE
  $ nimbu auth:whoami

ALIASES
  $ nimbu whoami
```

_See code: [lib/commands/auth/whoami.js](https://github.com/zenjoy/nimbu-toolbelt/blob/v5.0.0-alpha.7/lib/commands/auth/whoami.js)_
