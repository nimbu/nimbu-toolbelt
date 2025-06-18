import { Command } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'

// TODO: Reimplement without Ruby gem dependency
// import proxy from '../../nimbu-gem/command'

export default class ThemesPush extends Command {
  static args = {}

  static description = 'push the theme code online'

  static flags = {
    // --css, --css-only   # only push css
    css: Flags.boolean({ hidden: true }),
    'css-only': Flags.boolean({
      description: 'only push css',
    }),
    // --fonts-only    # only push fonts
    'fonts-only': Flags.boolean({
      description: 'only push fonts',
    }),
    // --force         # skip the usage check and upload anyway
    force: Flags.boolean({
      description: 'skip the usage check and upload anyway',
    }),
    // --images-only   # only push new images
    'images-only': Flags.boolean({
      description: 'only push new images',
    }),
    // --js, --js-only   # only push javascript
    js: Flags.boolean({ hidden: true }),
    'js-only': Flags.boolean({
      description: 'only push javascript',
    }),
    // --liquid, --liquid-only   # only push template code
    liquid: Flags.boolean({
      hidden: true,
    }),
    'liquid-only': Flags.boolean({
      description: 'only push template code',
    }),
    // --only          # only push the files given on the command line
    only: Flags.boolean({
      description: 'only push the files given on the command line',
    }),
  }

  static strict = false

  async execute() {
    this.error('themes:push command needs to be reimplemented without Ruby gem dependency')
    // TODO: Reimplement this command to use the Node.js proxy server
  }
}
