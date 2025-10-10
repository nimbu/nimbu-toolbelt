import { Config } from '@oclif/core'
import { expect } from 'chai'
import { resolve as resolvePath } from 'node:path'

import Command from '../src/command'
import * as flags from '../src/flags'

const cliRoot = resolvePath(__dirname, '../..', 'cli')

const loadCommandConfig = () => Config.load({ root: cliRoot })

class MyCommand extends Command {
  async execute() {
    // noop
  }
}

describe('cli base command', () => {
  it('has a flag to set the site', async () => {
    class SiteCommand extends Command {
      static flags = {
        site: flags.site(),
      }

      async execute() {
        const { flags } = await this.parse(SiteCommand)
        expect(flags.site).to.equal('mysite')
      }
    }

    await SiteCommand.run(['--site=mysite'])
  })

  it('has a nimbu API client', async () => {
    const config = await loadCommandConfig()
    const cmd = new MyCommand([], config)
    await cmd.initialize()
    expect(cmd.nimbu).to.exist
  })
})
