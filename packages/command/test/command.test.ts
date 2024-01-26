import { Config } from '@oclif/core'
import base, { expect } from 'fancy-test'

import Command from '../src/command'
import * as flags from '../src/flags'

const test = base.add('config', () => Config.load())

class MyCommand extends Command {
  async execute() {
    // noop
  }
}

describe('cli base command', () => {
  it('has a flag to set the site', async () =>
    class SiteCommand extends Command {
      static flags = {
        site: flags.site(),
      }

      async execute() {
        const { flags } = await this.parse(SiteCommand)
        expect(flags.site).to.equal('mysite')
      }
    }.run(['--site=mysite']))

  test.it('has a nimbu API client', async (ctx) => {
    const cmd = new MyCommand([], ctx.config)
    await cmd.initialize()
    expect(cmd.nimbu).to.be.ok
  })
})
