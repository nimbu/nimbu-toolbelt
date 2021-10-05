import { expect, test } from '@oclif/test'

describe('auth:token', () => {
  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .nock('https://api.nimbu.io', api =>
      api
        .get('/tokens')
        // return some tokens
        .reply(200, [{ token: 'waldo' }, { token: 'foobar', expires_in: 60 }, {}]),
    )
    .stdout()
    .stderr()
    .command(['auth:token'])
    .it('should show the currently used api token', ctx => {
      expect(ctx.stdout).to.equal('foobar\n')
      expect(ctx.stderr).to.match(new RegExp('Warning: token will expire today'))
    })
})
