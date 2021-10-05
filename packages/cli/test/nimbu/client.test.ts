import nock from 'nock'
import * as Config from '@oclif/config'
import base, { expect } from 'fancy-test'

import { default as CommandBase } from '../../src/command'

const test = base.add('config', () => Config.load())

class Command extends CommandBase {
  async execute() {}
}

const token = 'YTljNzExMjYwNzAyYWQ2MmZjNDA4Yzdi'

const netrc = require('netrc-parser').default
netrc.loadSync = function (this: typeof netrc) {
  netrc.machines = {
    'api.nimbu.io': { password: token },
    'api.nimbu.dev': { password: token },
  }
}

let api: nock.Scope

describe('cli api client', () => {
  test.it('makes an HTTP request', async (ctx) => {
    api = nock('https://api.nimbu.io', {
      reqheaders: {
        authorization: `${token}`,
      },
    })
    api.get('/channels').reply(200, [{ name: 'mychannel' }])

    const cmd = new Command([], ctx.config)
    await cmd.initialize()
    const result = await cmd.nimbu.get('/channels')
    expect(result).to.deep.equal([{ name: 'mychannel' }])
    expect(api.isDone()).to.be.true
  })

  test.it('can override authorization header', async (ctx) => {
    api = nock('https://api.nimbu.io', {
      reqheaders: { authorization: 'myotherpass' },
    })
    api.get('/channels').reply(200, [{ name: 'mychannel' }])

    const cmd = new Command([], ctx.config)
    await cmd.initialize()
    const result = await cmd.nimbu.get('/channels', {
      headers: { Authorization: 'myotherpass' },
    })
    expect(result).to.deep.equal([{ name: 'mychannel' }])
  })

  test
    .env({ NIMBU_HOST: 'http://api.nimbu.dev' }, { clear: true })
    .it('makes an HTTP request with NIMBU_HOST', async (ctx) => {
      api = nock('http://api.nimbu.dev')
      api.get('/channels').reply(200, [{ name: 'mychannel' }])

      const cmd = new Command([], ctx.config)
      await cmd.initialize()
      const result = await cmd.nimbu.get('/channels')

      expect(result).to.deep.equal([{ name: 'mychannel' }])
      expect(api.isDone()).to.be.true
    })

  test.it('can fetch all pages', async (ctx) => {
    let api1 = nock('https://api.nimbu.io')
      .get('/channels')
      .reply(200, [{ name: 'foo' }], {
        Link: '<https://api.nimbu.io/channels?page=2>; rel="next", <https://api.nimbu.io/channels?page=2>; rel="last"',
      })

    let api2 = nock('https://api.nimbu.io')
      .get('/channels')
      .query({ page: 2 })
      .reply(200, [{ name: 'bar' }], {
        Link: '<https://api.nimbu.io/channels?page=1>; rel="prev", <https://api.nimbu.io/channels?page=1>; rel="first"',
      })

    const cmd = new Command([], ctx.config)
    await cmd.initialize()
    const result = await cmd.nimbu.get('/channels', { fetchAll: true })
    expect(result).to.deep.equal([{ name: 'foo' }, { name: 'bar' }])
    expect(api1.isDone() && api2.isDone()).to.be.true
  })
})
