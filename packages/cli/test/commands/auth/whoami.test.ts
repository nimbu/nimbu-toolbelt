import { expect, test } from '@oclif/test'

describe('auth:whoami', () => {
  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .nock('https://api.nimbu.io', api =>
      api
        .get('/user')
        // user is logged in, return their name
        .reply(200, { email: 'jeff@example.com', name: 'Jeff' }),
    )
    .stdout()
    .stderr()
    .command(['auth:whoami'])
    .it('should show the current user when logged in', ctx => {
      expect(ctx.stdout).to.equal('Logged in as jeff@example.com (Jeff)\n')
      expect(ctx.stderr).to.match(new RegExp('Warning: NIMBU_API_KEY is set'))
    })

  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .nock('https://api.nimbu.io', api => api.get('/user').reply(401))
    .stderr()
    .command(['auth:whoami'])
    .exit(100)
    .it('exits with status 100 when not logged in', ctx => {
      expect(ctx.stderr).to.contain('Warning: NIMBU_API_KEY is set')
    })
})
