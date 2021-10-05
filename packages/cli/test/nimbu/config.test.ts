import test, { expect } from 'fancy-test'

import Config from '../../src/nimbu/config'

describe('cli client configuration', () => {
  test.it('sets vars by default', () => {
    const config = new Config({})
    expect(config.host).to.equal('nimbu.io')
    expect(config.apiHost).to.equal('api.nimbu.io')
    expect(config.apiUrl).to.equal('https://api.nimbu.io')
    expect(config.secureHost).to.be.true
  })

  test.env({ NIMBU_HOST: 'customhost.com' }, { clear: true }).it('respects NIMBU_HOST', () => {
    const config = new Config({})
    expect(config.host).to.equal('customhost.com')
    expect(config.apiHost).to.equal('api.customhost.com')
    expect(config.apiUrl).to.equal('https://api.customhost.com')
    expect(config.secureHost).to.be.true
  })

  test.env({ NIMBU_HOST: 'http://customhost' }, { clear: true }).it('respects NIMBU_HOST as url', () => {
    const config = new Config({})
    expect(config.host).to.equal('http://customhost')
    expect(config.apiHost).to.equal('customhost')
    expect(config.apiUrl).to.equal('http://customhost')
    expect(config.secureHost).to.be.false
  })
})
