import { Command } from '@nimbu-cli/command'
import { Flags } from '@oclif/core'

import proxy from '../../nimbu-gem/command'

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
    await this.nimbu.validateLogin()

    if (this.nimbu.token !== undefined) {
      if (this.nimbuConfig.site == null) {
        this.error('No site configured')
      }

      // don't parse, then this.argv is the original arguments (including flags)
      await proxy(this.nimbuConfig.site, this.nimbu.token, 'themes:push', this.argv)
    }
  }
}
