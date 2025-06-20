import { Command } from '@nimbu-cli/command'
import { Args, Flags } from '@oclif/core'
import chalk from 'chalk'

export default class ThemesList extends Command {
  static args = {
    theme: Args.string({
      description: 'The name of the theme to list',
      name: 'theme',
    }),
  }

  static description = 'list all layouts, templates, snippets and assets'

  static flags = {
    site: Flags.string({
      char: 's',
      description: 'the site of the theme',
    }),
  }

  async execute() {
    const { args, flags } = await this.parse(ThemesList)
    
    const theme = args.theme || this.nimbuConfig.theme || 'default-theme'
    const site = flags.site || this.nimbuConfig.site

    if (!site) {
      this.error('You need to specify a site using --site flag or configure it in nimbu.yml')
    }

    this.log(`\nShowing layouts, templates, snippets and assets for ${chalk.red.bold(theme)}:`)

    try {
      const contents = await this.nimbu.get(`/themes/${theme}`, {
        fetchAll: true,
        site,
      }) as any

      if (contents.layouts && contents.layouts.length > 0) {
        this.log(chalk.bold('\nLayouts:'))
        for (const l of contents.layouts) {
          this.log(` - layouts/${l.name}`)
        }
      }

      if (contents.templates && contents.templates.length > 0) {
        this.log(chalk.bold('\nTemplates:'))
        for (const t of contents.templates) {
          this.log(` - templates/${t.name}`)
        }
      }

      if (contents.snippets && contents.snippets.length > 0) {
        this.log(chalk.bold('\nSnippets:'))
        for (const s of contents.snippets) {
          this.log(` - snippets/${s.name}`)
        }
      }

      if (contents.assets && contents.assets.length > 0) {
        this.log(chalk.bold('\nAssets:'))
        for (const a of contents.assets) {
          this.log(` - ${a.folder}/${a.name}`)
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to fetch theme contents: ${error.message}`)
      }

      throw error
    }
  }
}
