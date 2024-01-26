/* eslint-disable import/namespace */
import { Command, APITypes as Nimbu, color } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import * as fs from 'fs-extra'
import inquirer from 'inquirer'
import { orderBy } from 'lodash'
import logSymbols from 'log-symbols'

export default class Init extends Command {
  static description = 'initialize your working directory to code a selected theme'

  static flags = {
    cloudcode: Flags.boolean({
      char: 'c',
      default: false,
      description: 'Create CloudCode directory',
    }),
    haml: Flags.boolean({
      char: 'h',
      default: false,
      description: 'Use HAML for the templates in this project',
    }),
    site: Flags.string({
      char: 's',
      // completion: completions.SiteSubdomainCompletion,
      description: 'The site (use the Nimbu subdomain) to link to this project.',
      env: 'NIMBU_SITE',
    }),
  }

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    const { flags } = await this.parse(Init)

    let subdomain
    let haml
    let cloudcode

    if (flags.site) {
      subdomain = flags.site
      haml = flags.haml
      cloudcode = flags.cloudcode
    } else {
      const site = await this.askForSite()
      subdomain = site.subdomain
      haml = await this.askForHaml()
      cloudcode = await this.askForCloudCode()
    }

    await this.createDirectories(cloudcode, haml)
    await this.createConfig(subdomain)
  }

  private async askForCloudCode() {
    const answer = await inquirer.prompt({
      default: true,
      message: 'Will you work with cloud code?',
      name: 'cloudcode',
      type: 'confirm',
    })

    return answer.cloudcode
  }

  private async askForHaml() {
    const answer = await inquirer.prompt({
      default: true,
      message: 'Would you like to work with HAML?',
      name: 'haml',
      type: 'confirm',
    })

    return answer.haml
  }

  private async askForSite() {
    ux.action.start('Please wait while we get the list of sites...')
    let sites = await this.nimbu.get<Nimbu.Site[]>('/sites', { fetchAll: true })
    ux.action.stop('done \n')

    if (sites.length === 0) {
      this.error("You don't have access to any Nimbu sites.", { exit: 101 })
    }

    if (sites.length > 1) {
      sites = orderBy(sites, [(site) => site.name.toLowerCase()], ['asc'])
      const choices = sites.map((s) => `${s.name} ${color.dim(`(${s.subdomain})`)}`)
      const fuzzy = require('fuzzy')
      const autocompletePrompt = require('inquirer-autocomplete-prompt')

      inquirer.registerPrompt('autocomplete', autocompletePrompt)
      const answer = await inquirer.prompt({
        message: 'On which site would you like to work?',
        name: 'site',
        async source(_, input = '') {
          // eslint-disable-next-line unicorn/no-array-method-this-argument
          return fuzzy.filter(input, choices).map((el) => el.original)
        },
        type: 'autocomplete',
      })
      return sites[choices.indexOf(answer.site)]
    }

    this.log(
      logSymbols.success,
      `You are only linked to ${color.bold(sites[0].name)}, so let's use that for this project.`,
    )

    return sites[0]
  }

  private async createConfig(subdomain) {
    const currentDir = process.cwd()
    const filename = currentDir + '/nimbu.yml'
    const content = `theme: default-theme\nsite: ${subdomain}`

    if (fs.existsSync(filename)) {
      const answer = await inquirer.prompt({
        default: false,
        message: 'A nimbu.yml file already exists. Would you like to overwrite?',
        name: 'overwrite',
        type: 'confirm',
      })

      if (!answer.overwrite) {
        return
      }
    }

    await fs.writeFile(filename, content)
  }

  private async createDirectories(useCloudCode = false, useHaml = false) {
    const assets = ['stylesheets', 'javascripts', 'images']
    const templates = ['layouts', 'templates', 'snippets']

    const dirs = [...templates, ...assets]

    if (useHaml) {
      for (const t of templates) {
        dirs.push(`haml/${t}`)
      }
    }

    if (useCloudCode) {
      dirs.push('cloudcode')
    }

    this.log('\nInitializing directories:')
    const currentDir = process.cwd()
    for (const d of dirs.sort()) {
      this.log(`- ${d}`)
      try {
        await fs.mkdirp(currentDir + '/' + d)
        // tslint:disable-next-line: no-unused
      } catch {
        // do nothing
      }
    }

    this.log('\nDone.')
  }
}
