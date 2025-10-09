import { Command } from '@nimbu-cli/command'

export default class BrowseSimulator extends Command {
  static description = 'open the simulator for your current site'

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    const { default: open } = await import('open')
    await open('http://localhost:4567/') // TODO: the port should be configurable
  }
}
