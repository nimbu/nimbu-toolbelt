import { APIClient, APIError, HTTPError } from '@nimbu-cli/command'
import { expect } from 'chai'

import test from '../../helpers/setup'

describe('auth:whoami', () => {
  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .stub(APIClient.prototype, 'get', () => Promise.resolve({ email: 'jeff@example.com', name: 'Jeff' }))
    .stdout()
    .stderr()
    .command(['auth:whoami'])
    .it('should show the current user when logged in', (ctx) => {
      expect(ctx.stdout).to.equal('Logged in as jeff@example.com (Jeff)\n')
      expect(ctx.stderr).to.match(new RegExp('Warning: NIMBU_API_KEY is set'))
    })

  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .stub(APIClient.prototype, 'get', () => {
      const httpError = Object.assign(new HTTPError(), {
        statusCode: 401,
        body: { message: 'Unauthorized' },
      })

      return Promise.reject(new APIError(httpError as HTTPError))
    })
    .stderr()
    .command(['auth:whoami'])
    .exit(100)
    .it('exits with status 100 when not logged in', (ctx) => {
      expect(ctx.stderr).to.contain('Warning: NIMBU_API_KEY is set')
    })
})
