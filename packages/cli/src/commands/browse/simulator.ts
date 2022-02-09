import Command from '@nimbu-cli/command'
import { CliUx } from '@oclif/core'

export default class BrowseSimulator extends Command {
  static description = 'open the simulator for your current site'

  async execute() {
    await CliUx.ux.open('http://localhost:4567/')
  }

  get needsConfig(): boolean {
    return false
  }
}
