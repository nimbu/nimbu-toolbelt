import { Command } from '@nimbu-cli/command'

export default class AppsTranspile extends Command {
  static description = 'Transpile a file from ES6 to ES5 for compatiblity with legacy Nimbu Cloud engine'

  async execute() {
    // Transpiling is deprecated an no longer needed.
    this.log('Transpiling is deprecated and no longer needed for modern Nimbu Cloud code.')
  }
}
