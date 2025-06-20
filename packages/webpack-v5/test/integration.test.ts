import { expect } from 'chai'

import Server from '../src/commands/server'

describe('Webpack Integration', () => {
  it('should have updated description', () => {
    expect(Server.description).to.equal('run the development server (webpack 5)')
  })

  it('should have updated nimbu-port description', () => {
    const nimbuPortFlag = Server.flags['nimbu-port']
    expect(nimbuPortFlag.description).to.equal('The port for the nimbu proxy server to listen on.')
  })

  it('should not have legacy Ruby gem flags', () => {
    expect((Server.flags as any).compass).to.be.undefined
    expect((Server.flags as any).haml).to.be.undefined
    expect((Server.flags as any).nocookies).to.be.undefined
  })

  it('should have essential flags for webpack integration', () => {
    expect(Server.flags.host).to.exist
    expect(Server.flags['nimbu-port']).to.exist
    expect(Server.flags.port).to.exist
    expect(Server.flags.nowebpack).to.exist
  })
})