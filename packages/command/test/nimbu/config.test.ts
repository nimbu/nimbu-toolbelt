import { expect } from 'chai'

import { Config } from '../../src/nimbu/config'

const withEnv = (vars: Record<string, string>, fn: () => void) => {
  const previous = new Map<string, string | undefined>()
  for (const [key, value] of Object.entries(vars)) {
    previous.set(key, process.env[key])
    process.env[key] = value
  }

  try {
    fn()
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

describe('cli client configuration', () => {
  it('sets vars by default', () => {
    const config = new Config({})
    expect(config.host).to.equal('nimbu.io')
    expect(config.apiHost).to.equal('api.nimbu.io')
    expect(config.apiUrl).to.equal('https://api.nimbu.io')
    expect(config.secureHost).to.be.true
  })

  it('respects NIMBU_HOST', () => {
    withEnv({ NIMBU_HOST: 'customhost.com' }, () => {
      const config = new Config({})
      expect(config.host).to.equal('customhost.com')
      expect(config.apiHost).to.equal('api.customhost.com')
      expect(config.apiUrl).to.equal('https://api.customhost.com')
      expect(config.secureHost).to.be.true
    })
  })

  it('respects NIMBU_HOST as url', () => {
    withEnv({ NIMBU_HOST: 'http://customhost' }, () => {
      const config = new Config({})
      expect(config.host).to.equal('http://customhost')
      expect(config.apiHost).to.equal('customhost')
      expect(config.apiUrl).to.equal('http://customhost')
      expect(config.secureHost).to.be.false
    })
  })
})
