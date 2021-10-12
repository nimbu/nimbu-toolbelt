import { expect, test } from '@oclif/test'
import nock from 'nock'
import { matches } from 'lodash'
import { destinations, countries, journeys } from './fixtures'

describe('channels:copy --from foo --to bar --all', () => {
  let api = nock('https://api.nimbu.io').get('/channels').reply(200, [destinations, journeys, countries])

  const channels = [destinations, journeys, countries]
  channels.forEach((channel) => {
    api
      .get(`/channels/${channel.slug}`)
      .reply(404, { message: 'Not found', code: 101 })
      .post('/channels', matches({ slug: channel.slug }))
      .reply(201, channel)
  })

  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .stdout()
    .stderr()
    .command(['channels:copy', '--from', 'foo', '--to', 'bar', '--all'])
    .it('should copy all channels from one site to another', (ctx) => {
      expect(api.isDone()).to.be.true
      // expect(ctx.stdout).to.equal('  ✔ Fetching all channels from foo\n  ✔ Copying all channels to bar\n')
    })
})

describe('channels:copy --from site1/foo --to site2/bar', () => {
  let apiSite1 = nock('https://api.nimbu.io', {
    reqheaders: {
      'X-Nimbu-Site': 'site1',
    },
  })
    .get('/channels/foo')
    .reply(200, destinations)

  let apiSite2 = nock('https://api.nimbu.io', {
    reqheaders: {
      'X-Nimbu-Site': 'site2',
    },
  })
    .get(`/channels/bar`)
    .reply(404, { message: 'Not found', code: 101 })
    .post('/channels', matches({ slug: 'bar' }))
    .reply(201, destinations)

  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .stdout()
    .stderr()
    .command(['channels:copy', '--from', 'site1/foo', '--to', 'site2/bar'])
    .it('should copy the channel foo from one site1 to site2', (ctx) => {
      expect(apiSite1.isDone()).to.be.true
      expect(apiSite2.isDone()).to.be.true
      // expect(ctx.stdout).to.equal('  ✔ Fetching channel foo from site site1\n  ✔ Creating channel bar in site site2\n')
    })
})
