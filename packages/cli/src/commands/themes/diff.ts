import { Command } from '@nimbu-cli/command'
import { Args, Flags } from '@oclif/core'
import chalk from 'chalk'
import { diffLines } from 'diff'
import * as fs from 'fs-extra'
import * as path from 'node:path'

export default class ThemesDiff extends Command {
  static args = {
    theme: Args.string({
      description: 'The name of the theme to compare',
      name: 'theme',
    }),
  }

  static description = 'show differences between local and server theme files'

  static flags = {
    site: Flags.string({
      char: 's',
      description: 'the site of the theme',
    }),
  }

  private diff: Record<string, boolean> = {}

  async execute() {
    const { args, flags } = await this.parse(ThemesDiff)

    const theme = args.theme || this.nimbuConfig.theme || 'default-theme'
    const site = flags.site || this.nimbuConfig.site

    if (!site) {
      this.error('You need to specify a site using --site flag or configure it in nimbu.yml')
    }

    this.log(
      `\nShowing differences between local and server\nlayouts, templates, snippets and assets for ${chalk.green.bold(
        theme,
      )}:`,
    )

    try {
      const json = (await this.nimbu.get(`/themes/${theme}`, {
        fetchAll: true,
        site,
      })) as any

      await this.checkDifferences(json, theme, site, 'layouts', 'templates', 'snippets')
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to fetch theme contents: ${error.message}`)
      }

      throw error
    }
  }

  private async checkDifferences(contents: any, theme: string, site: string, ...types: string[]) {
    for (const type of types) {
      if (contents[type] && contents[type].length > 0) {
        this.log(chalk.bold(`\n${type.charAt(0).toUpperCase() + type.slice(1)}: `))
        for (const item of contents[type]) {
          await this.compare(item, theme, site, type)
        }

        if (!this.diff[type]) {
          this.log('no differences found!')
        }
      }
    }
  }

  private async compare(data: any, theme: string, site: string, type: string) {
    const filePath = path.join(this.nimbuConfig.projectPath, type, data.name)

    if (await fs.pathExists(filePath)) {
      try {
        const fileContent = await fs.readFile(filePath, 'utf8')
        const local = fileContent.replaceAll(/\r\n?/g, '\n').trim()

        const serverResponse = (await this.nimbu.get(`/themes/${theme}/${type}/${data.name}`, {
          site,
        })) as any

        const serverCode = serverResponse.code || ''
        const server = serverCode.replaceAll(/\r\n?/g, '\n').trim()

        if (local !== server) {
          const diffOutput = this.createDiff(local, server)
          if (diffOutput) {
            this.log(` - ${type}/${data.name} has ${chalk.yellow.bold('changed')}:\n${diffOutput}`)
            this.diff[type] = true
          }
        }
      } catch {
        this.log(` - ${type}/${data.name} ${chalk.red.bold('error fetching server version')}`)
        this.diff[type] = true
      }
    } else {
      this.diff[type] = true
      this.log(` - ${type}/${data.name} is ${chalk.red.bold('missing')}`)
    }
  }

  private createDiff(local: string, server: string): string {
    const diff = diffLines(local, server)
    const output: string[] = []

    for (const part of diff) {
      const lines = part.value.split('\n')

      // Remove the last empty line that split() creates
      if (lines.at(-1) === '') {
        lines.pop()
      }

      for (const line of lines) {
        if (part.added) {
          output.push(chalk.red(`+ ${line}`))
        } else if (part.removed) {
          output.push(chalk.green(`- ${line}`))
        } else {
          output.push(chalk.gray(`  ${line}`))
        }
      }
    }

    return output.join('\n')
  }
}
