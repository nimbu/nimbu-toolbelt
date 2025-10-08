import { APIClient, APIError, HTTPError } from '@nimbu-cli/command'
import { expect } from 'chai'

import test from '../../helpers/setup'
import { destinations, countries, journeys } from './fixtures'

const notFoundError = () => {
  const httpError = Object.assign(new HTTPError(), {
    statusCode: 404,
    body: { code: 101, message: 'Not found' },
  })

  return new APIError(httpError as HTTPError)
}

describe('channels:copy --from foo --to bar --all', () => {
  const createdChannels = new Map<string, { payload: any; type: 'placeholder' | 'channel' }>()

  const getStub = async (path: string, options: any = {}) => {
    const site = options?.site
    if (path === '/channels' && site === 'foo') {
      return [destinations, journeys, countries]
    }

    if (site === 'bar' && path.startsWith('/channels/')) {
      const slug = path.split('/').pop()!
      const existing = createdChannels.get(slug)
      if (existing?.type === 'channel') {
        return existing.payload
      }

      throw notFoundError()
    }

    throw new Error(`Unexpected GET ${path} for site ${site}`)
  }

  const postStub = async (_path: string, options: any = {}) => {
    const slug = options?.body?.slug
    if (!slug) throw new Error('Missing slug in post payload')

    const isPlaceholder = options?.body?.customizations?.[0]?.label === 'Dummy Field for Circular Dependencies'
    const entry = {
      payload: options.body,
      type: isPlaceholder ? ('placeholder' as const) : ('channel' as const),
    }

    createdChannels.set(slug, entry)
    return options.body
  }

  const patchStub = async (_path: string) => {
    throw new Error('Unexpected PATCH call')
  }

  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .do(() => {
      createdChannels.clear()
    })
    .stub(APIClient.prototype, 'get', getStub)
    .stub(APIClient.prototype, 'post', postStub)
    .stub(APIClient.prototype, 'patch', patchStub)
    .stdout()
    .stderr()
    .command(['channels:copy', '--from', 'foo', '--to', 'bar', '--all'])
    .it('should copy all channels from one site to another', () => {
      const copied = [...createdChannels.values()].filter((entry) => entry.type === 'channel')
      expect(copied.map((entry) => entry.payload.slug).sort()).to.deep.equal([
        countries.slug,
        destinations.slug,
        journeys.slug,
      ])
    })
})

describe('channels:copy --from site1/foo --to site2/bar', () => {
  const createdChannels: string[] = []

  const getStub = async (path: string, options: any = {}) => {
    const site = options?.site

    if (path === '/channels/foo' && site === 'site1') {
      return destinations
    }

    if (path === '/channels/bar' && site === 'site2') {
      throw notFoundError()
    }

    throw new Error(`Unexpected GET ${path} for site ${site}`)
  }

  const postStub = async (_path: string, options: any = {}) => {
    const slug = options?.body?.slug
    if (slug) createdChannels.push(slug)
    return options.body
  }

  const patchStub = async (_path: string) => {
    throw new Error('Unexpected PATCH call')
  }

  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .do(() => {
      createdChannels.length = 0
    })
    .stub(APIClient.prototype, 'get', getStub)
    .stub(APIClient.prototype, 'post', postStub)
    .stub(APIClient.prototype, 'patch', patchStub)
    .stdout()
    .stderr()
    .command(['channels:copy', '--from', 'site1/foo', '--to', 'site2/bar'])
    .it('should copy the channel foo from one site1 to site2', () => {
      expect(createdChannels).to.deep.equal(['bar'])
    })
})
