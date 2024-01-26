import { Command } from '@nimbu-cli/command'
import open from 'open'

export default class BrowseSimulator extends Command {
  static description = 'open the simulator for your current site'

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    await open('http://localhost:4567/') // TODO: the port should be configurable
  }
}
