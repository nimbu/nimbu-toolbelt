import { APIClient } from '@nimbu-cli/command'
import { expect } from 'chai'

import test from '../../helpers/setup'

describe('auth:token', () => {
  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .stub(APIClient.prototype, 'get', () =>
      Promise.resolve([{ token: 'waldo' }, { expires_in: 60, token: 'foobar' }, {}]),
    )
    .stdout()
    .stderr()
    .command(['auth:token'])
    .it('should show the currently used api token', (ctx) => {
      expect(ctx.stdout).to.equal('foobar\n')
      expect(ctx.stderr).to.match(/Warning: token will expire today/)
    })
})
