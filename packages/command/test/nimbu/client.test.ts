import { Config } from '@oclif/core'
import { expect } from 'chai'
import nock from 'nock'
import { resolve as resolvePath } from 'node:path'

import CommandBase from '../../src/command'

const token = 'YTljNzExMjYwNzAyYWQ2MmZjNDA4Yzdi'
const netrc = require('netrc-parser').default

netrc.loadSync = function (this: typeof netrc) {
  netrc.machines = {
    'api.nimbu.dev': { login: 'nimbu', password: token },
    'api.nimbu.io': { login: 'nimbu', password: token },
  }
}

const cliRoot = resolvePath(__dirname, '../../..', 'cli')

const loadCommandConfig = () => Config.load({ root: cliRoot })

class Command extends CommandBase {
  async execute() {
    // noop
  }
}

const withEnv = async (vars: Record<string, string>, fn: () => Promise<void>) => {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key])
    process.env[key] = value
  }

  try {
    await fn()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

describe('cli api client', () => {
  before(() => {
    nock.disableNetConnect()
  })

  afterEach(() => {
    nock.abortPendingRequests()
    nock.cleanAll()
  })

  after(() => {
    nock.enableNetConnect()
  })

  it('makes an HTTP request', async () => {
    const api = nock('https://api.nimbu.io', {
      reqheaders: {
        authorization: `${token}`,
      },
    })
      .get('/channels')
      .reply(200, [{ name: 'mychannel' }])

    const config = await loadCommandConfig()
    const cmd = new Command([], config)
    await cmd.initialize()
    const result = await cmd.nimbu.get('/channels')
    expect(result).to.deep.equal([{ name: 'mychannel' }])
    expect(api.isDone()).to.be.true
  })

  it('can override authorization header', async () => {
    const api = nock('https://api.nimbu.io', {
      reqheaders: { authorization: 'myotherpass' },
    })
      .get('/channels')
      .reply(200, [{ name: 'mychannel' }])

    const config = await loadCommandConfig()
    const cmd = new Command([], config)
    await cmd.initialize()
    const result = await cmd.nimbu.get('/channels', {
      headers: { Authorization: 'myotherpass' },
    })
    expect(result).to.deep.equal([{ name: 'mychannel' }])
    expect(api.isDone()).to.be.true
  })

  it('makes an HTTP request with NIMBU_HOST', async () => {
    await withEnv({ NIMBU_HOST: 'http://api.nimbu.dev' }, async () => {
      const api = nock('http://api.nimbu.dev')
        .get('/channels')
        .reply(200, [{ name: 'mychannel' }])

      const config = await loadCommandConfig()
      const cmd = new Command([], config)
      await cmd.initialize()
      const result = await cmd.nimbu.get('/channels')

      expect(result).to.deep.equal([{ name: 'mychannel' }])
      expect(api.isDone()).to.be.true
    })
  })

  it('can fetch all pages', async () => {
    const api1 = nock('https://api.nimbu.io')
      .get('/channels')
      .reply(200, [{ name: 'foo' }], {
        Link: '<https://api.nimbu.io/channels?page=2>; rel="next", <https://api.nimbu.io/channels?page=2>; rel="last"',
      })

    const api2 = nock('https://api.nimbu.io')
      .get('/channels')
      .query({ page: 2 })
      .reply(200, [{ name: 'bar' }], {
        Link: '<https://api.nimbu.io/channels?page=1>; rel="prev", <https://api.nimbu.io/channels?page=1>; rel="first"',
      })

    const config = await loadCommandConfig()
    const cmd = new Command([], config)
    await cmd.initialize()
    const result = await cmd.nimbu.get('/channels', { fetchAll: true })
    expect(result).to.deep.equal([{ name: 'foo' }, { name: 'bar' }])
    expect(api1.isDone() && api2.isDone()).to.be.true
  })
})
