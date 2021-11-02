//import { expect } from '@oclif/test'
import test from '../../helpers/setup'
import { matches } from 'lodash'
import { destinations, countries, journeys } from './fixtures'

describe('channels:copy --from foo --to bar --all', () => {
  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .nock('https://api.nimbu.io', (api) => {
      api.get('/channels').reply(200, [destinations, journeys, countries])

      const channels = [destinations, journeys, countries]
      channels.forEach((channel) => {
        api
          .get(`/channels/${channel.slug}`)
          .reply(404, { message: 'Not found', code: 101 })
          .post('/channels', matches({ slug: channel.slug }))
          .reply(201, channel)
      })
    })
    .stdout()
    .stderr()
    .command(['channels:copy', '--from', 'foo', '--to', 'bar', '--all'])
    .it('should copy all channels from one site to another')
})

describe('channels:copy --from site1/foo --to site2/bar', () => {
  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .nock(
      'https://api.nimbu.io',
      {
        reqheaders: {
          'X-Nimbu-Site': 'site1',
        },
      },
      (api) => {
        api.get('/channels/foo').reply(200, destinations)
      },
    )
    .nock(
      'https://api.nimbu.io',
      {
        reqheaders: {
          'X-Nimbu-Site': 'site2',
        },
      },
      (api) => {
        api
          .get(`/channels/bar`)
          .reply(404, { message: 'Not found', code: 101 })
          .post('/channels', matches({ slug: 'bar' }))
          .reply(201, destinations)
      },
    )
    .stdout()
    .stderr()
    .command(['channels:copy', '--from', 'site1/foo', '--to', 'site2/bar'])
    .it('should copy the channel foo from one site1 to site2')
})
