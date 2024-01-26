import { transformFileAsync } from '@babel/core'
import { Command } from '@nimbu-cli/command'
import { Args } from '@oclif/core'
import { outputFile } from 'fs-extra'

export default class AppsTranspile extends Command {
  static args = {
    source: Args.string({ name: 'source', required: true }),
    target: Args.string({ name: 'target', required: true }),
  }

  static description = 'Transpile a file from ES6 to ES5 for compatiblity with Nimbu Cloud applications'

  async execute() {
    const { args } = await this.parse(AppsTranspile)
    this.log(`Transpiling ${args.source} to ${args.target}`)
    const result = await transformFileAsync(args.source, {
      presets: [
        [
          require.resolve('@babel/preset-env'),
          {
            forceAllTransforms: true,
            modules: false,
          },
        ],
      ],
    })
    if (result && result.code) {
      await outputFile(args.target, result.code)
    } else {
      throw new Error('Could not transpile!')
    }
  }
}
