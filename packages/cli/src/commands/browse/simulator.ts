import Command from '../../command'
import cli from 'cli-ux'

export default class BrowseSimulator extends Command {
  static description = 'open the simulator for your current site'

  async execute() {
    await cli.open('http://localhost:4567/')
  }
}
