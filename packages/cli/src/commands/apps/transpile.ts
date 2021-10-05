import Command from '../../command'
import { transformFileAsync } from '@babel/core'
import { outputFile } from 'fs-extra'

export default class AppsTranspile extends Command {
  static description = 'Transpile a file from ES6 to ES5 for compatiblity with Nimbu Cloud applications'

  static args = [
    { name: 'source', required: true },
    { name: 'target', required: true },
  ]

  async execute() {
    const { args } = this.parse(AppsTranspile)
    this.log(`Transpiling ${args.source} to ${args.target}`)
    const result = await transformFileAsync(args.source, {
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
            forceAllTransforms: true,
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
