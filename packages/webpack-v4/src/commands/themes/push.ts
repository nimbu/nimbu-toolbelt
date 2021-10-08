import Command from '@nimbu-cli/command'
import { flags } from '@oclif/command'
import proxy from '../../nimbu-gem/command'

export default class ThemesPush extends Command {
  static description = 'push the theme code online'

  static flags = {
    // --liquid, --liquid-only   # only push template code
    liquid: flags.boolean({
      hidden: true,
    }),
    'liquid-only': flags.boolean({
      description: 'only push template code',
    }),
    // --css, --css-only   # only push css
    css: flags.boolean({ hidden: true }),
    'css-only': flags.boolean({
      description: 'only push css',
    }),
    // --js, --js-only   # only push javascript
    js: flags.boolean({ hidden: true }),
    'js-only': flags.boolean({
      description: 'only push javascript',
    }),
    // --images-only   # only push new images
    'images-only': flags.boolean({
      description: 'only push new images',
    }),
    // --fonts-only    # only push fonts
    'fonts-only': flags.boolean({
      description: 'only push fonts',
    }),
    // --only          # only push the files given on the command line
    only: flags.boolean({
      description: 'only push the files given on the command line',
    }),
    // --force         # skip the usage check and upload anyway
    force: flags.boolean({
      description: 'skip the usage check and upload anyway',
    }),
  }

  static strict = false

  static args = [
    {
      name: 'files',
      description: 'The files to push with --only',
    },
  ]

  async execute() {
    await this.nimbu.validateLogin()

    if (this.nimbu.token !== undefined) {
      // don't parse, then this.argv is the original arguments (including flags)
      await proxy(this.nimbuConfig.site!, this.nimbu.token, 'themes:push', this.argv)
    }
  }
}
