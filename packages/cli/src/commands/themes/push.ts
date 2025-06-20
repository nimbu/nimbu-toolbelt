import { Command } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import glob from 'fast-glob'
import * as fs from 'fs-extra'
import { statSync } from 'node:fs'
import * as path from 'node:path'

interface PushOptions {
  argv: string[]
  filesOnly: boolean
  site: string
  theme: string
}

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
    // --images-only   # only push new images
    'images-only': Flags.boolean({
      description: 'only push new images',
    }),
    // --js, --js-only   # only push scripts
    js: Flags.boolean({ hidden: true }),
    'js-only': Flags.boolean({
      description: 'only push scripts',
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
    site: Flags.string({
      char: 's',
      description: 'the site of the theme',
    }),
  }

  static strict = false

  async execute() {
    const { argv, flags } = await this.parse(ThemesPush)

    const theme = this.nimbuConfig.theme || 'default-theme'
    const site = flags.site || this.nimbuConfig.site

    if (!site) {
      this.error('You need to specify a site using --site flag or configure it in nimbu.yml')
    }

    const { cssOnly, fontsOnly, imagesOnly, jsOnly, liquidOnly } = {
      cssOnly: flags.css || flags['css-only'],
      fontsOnly: flags['fonts-only'],
      imagesOnly: flags['images-only'],
      jsOnly: flags.js || flags['js-only'],
      liquidOnly: flags.liquid || flags['liquid-only'],
    }
    const { only: filesOnly } = flags

    this.log(`Pushing layouts, templates and assets for '${theme}' to the server:`)

    const options: PushOptions = {
      argv: argv as string[],
      filesOnly,
      site,
      theme,
    }

    try {
      if (filesOnly) {
        // When --only is used, only push the specific files mentioned
        await this.pushSpecificFiles(options)
      } else {
        // Normal push logic based on flags
        const pushLiquid = !(cssOnly || jsOnly || imagesOnly || fontsOnly)
        const pushCss = !(liquidOnly || jsOnly || imagesOnly || fontsOnly)
        const pushJs = !(liquidOnly || cssOnly || imagesOnly || fontsOnly)
        const pushImages = !(liquidOnly || cssOnly || jsOnly || fontsOnly)
        const pushFonts = !(liquidOnly || cssOnly || jsOnly || imagesOnly)

        if (pushFonts) {
          await this.pushAssets('fonts', options)
        }

        if (pushImages) {
          await this.pushAssets('images', options)
        }

        if (pushCss) {
          await this.pushAssets('stylesheets', options)
        }

        if (pushJs) {
          await this.pushAssets('javascripts', options)
        }

        if (pushLiquid) {
          await this.pushLiquidFiles('snippets', options)
          await this.pushLiquidFiles('layouts', options)
          await this.pushLiquidFiles('templates', options)
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        this.error(`Failed to push theme: ${error.message}`)
      }

      throw error
    }
  }

  private async pushSpecificFiles(options: PushOptions) {
    // Group files by type
    const filesByType: Record<string, string[]> = {
      fonts: [],
      images: [],
      javascripts: [],
      layouts: [],
      snippets: [],
      stylesheets: [],
      templates: [],
    }

    for (const file of options.argv) {
      const parts = file.split('/')
      if (parts.length >= 2) {
        const type = parts[0]
        const filename = parts.slice(1).join('/')
        if (filesByType[type]) {
          filesByType[type].push(filename)
        }
      }
    }

    // Push assets
    for (const [type, files] of Object.entries(filesByType)) {
      if (files.length === 0) continue

      if (['fonts', 'images', 'javascripts', 'stylesheets'].includes(type)) {
        this.log(chalk.bold(`\n${type.charAt(0).toUpperCase() + type.slice(1)}:`))
        for (const file of files) {
          await this.uploadAsset(type, file, options)
        }
      } else if (['layouts', 'snippets', 'templates'].includes(type)) {
        this.log(chalk.bold(`\n${type.charAt(0).toUpperCase() + type.slice(1)}:`))
        for (const file of files) {
          await this.uploadLiquidFile(type, file, options)
        }
      }
    }
  }

  private async pushAssets(type: string, options: PushOptions) {
    this.log(chalk.bold(`\n${type.charAt(0).toUpperCase() + type.slice(1)}:`))

    let files: string[]

    if (options.filesOnly) {
      files = options.argv
        .filter((file: string) => file.startsWith(`${type}/`))
        .map((file: string) => file.replace(`${type}/`, ''))
    } else {
      try {
        const pattern = path.join(this.nimbuConfig.projectPath, type, '**/*')
        const allFiles = await glob(pattern)
        files = allFiles
          .filter((file) => {
            const filePath = typeof file === 'string' ? file : file.path
            return !statSync(filePath).isDirectory()
          })
          .map((file) => {
            const filePath = typeof file === 'string' ? file : file.path
            return path.relative(path.join(this.nimbuConfig.projectPath, type), filePath)
          })
      } catch {
        files = []
      }
    }

    for (const file of files) {
      await this.uploadAsset(type, file, options)
    }
  }

  private async pushLiquidFiles(type: string, options: PushOptions) {
    this.log(chalk.bold(`\n${type.charAt(0).toUpperCase() + type.slice(1)}:`))

    let files: string[]

    if (options.filesOnly) {
      files = options.argv
        .filter((file: string) => file.startsWith(`${type}/`))
        .map((file: string) => file.replace(`${type}/`, ''))
    } else {
      const pattern = path.join(this.nimbuConfig.projectPath, type, '**/*.liquid')
      const allFiles = await glob(pattern)
      files = allFiles.map((file) => {
        const filePath = typeof file === 'string' ? file : file.path
        return path.relative(path.join(this.nimbuConfig.projectPath, type), filePath)
      })
    }

    for (const file of files) {
      await this.uploadLiquidFile(type, file, options)
    }
  }

  private async uploadAsset(type: string, file: string, options: PushOptions) {
    const filePath = path.join(this.nimbuConfig.projectPath, type, file)

    if (!(await fs.pathExists(filePath))) {
      return
    }

    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) {
      return
    }

    process.stdout.write(` - ${type}/${file}`)

    try {
      const fileBuffer = await fs.readFile(filePath)
      const base64Content = fileBuffer.toString('base64')

      await this.nimbu.post(`/themes/${options.theme}/assets`, {
        body: {
          name: `${type}/${file}`,
          source: {
            __type: 'File',
            attachment: base64Content,
            filename: file,
          },
        },
        site: options.site,
      })

      this.log(' (ok)')
    } catch (error: any) {
      if (error.body?.message?.includes('Conflict')) {
        await this.handleConflict(error, file, type, options)
      } else {
        this.log(chalk.red(' could not be updated'))
        throw error
      }
    }
  }

  private async uploadLiquidFile(type: string, file: string, options: PushOptions) {
    const filePath = path.join(this.nimbuConfig.projectPath, type, file)

    if (!(await fs.pathExists(filePath))) {
      return
    }

    const stat = await fs.stat(filePath)
    if (stat.isDirectory()) {
      return
    }

    process.stdout.write(` - ${type}/${file}`)

    try {
      const content = await fs.readFile(filePath, 'utf8')

      await this.nimbu.post(`/themes/${options.theme}/${type}`, {
        body: {
          content,
          name: file,
        },
        site: options.site,
      })

      this.log(' (ok)')
    } catch (error: any) {
      if (error.body?.message?.includes('Conflict')) {
        await this.handleConflict(error, file, type, options)
      } else {
        this.log(chalk.red(' could not be updated'))
        throw error
      }
    }
  }

  private async handleConflict(error: any, filename: string, type: string, options: PushOptions) {
    const match = error.body?.message?.match(/Conflict \((.*)\)/)
    if (match) {
      this.log(chalk.red(` => WARNING!! ${match[1]}`))
      const shouldOverwrite = await ux.confirm(`    Do you want to overwrite these changes? (y/n)`)

      if (shouldOverwrite) {
        process.stdout.write(chalk.green(`     -> Forcing upload of ${filename}`))
        
        const filePath = path.join(this.nimbuConfig.projectPath, type, filename)
        
        if (['fonts', 'images', 'javascripts', 'stylesheets'].includes(type)) {
          const fileBuffer = await fs.readFile(filePath)
          const base64Content = fileBuffer.toString('base64')
          
          await this.nimbu.post(`/themes/${options.theme}/assets?force=true`, {
            body: {
              name: `${type}/${filename}`,
              source: {
                __type: 'File',
                attachment: base64Content,
                filename,
              },
            },
            site: options.site,
          })
        } else {
          const content = await fs.readFile(filePath, 'utf8')
          
          await this.nimbu.post(`/themes/${options.theme}/${type}?force=true`, {
            body: {
              content,
              name: filename,
            },
            site: options.site,
          })
        }
        
        this.log(': (ok)')
      } else {
        this.log(chalk.yellow(`     -> Ok, skipping upload of ${filename}`))
      }
    } else {
      this.log(chalk.red(' could not be updated'))
    }
  }
}
