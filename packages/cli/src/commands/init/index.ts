import Command from '../../command'
import * as Nimbu from '../../nimbu/types'
import { color } from '../../nimbu/color'
import { SiteSubdomainCompletion } from '../../flags/completions'

import { flags } from '@oclif/command'
import cli from 'cli-ux'
import { orderBy } from 'lodash'
import inquirer from 'inquirer'
import logSymbols from 'log-symbols'
import fs from 'fs-extra'

export default class Init extends Command {
  static description = 'initialize your working directory to code a selected theme'

  static flags = {
    cloudcode: flags.boolean({
      char: 'c',
      description: 'Create CloudCode directory',
      default: false,
    }),
    haml: flags.boolean({
      char: 'h',
      description: 'Use HAML for the templates in this project',
      default: false,
    }),
    site: flags.string({
      char: 's',
      completion: SiteSubdomainCompletion,
      description: 'The site (use the Nimbu subdomain) to link to this project.',
      env: 'NIMBU_SITE',
    }),
  }

  async execute() {
    const { flags } = this.parse(Init)

    let subdomain
    let haml
    let cloudcode

    if (flags.site) {
      subdomain = flags.site
      haml = flags.haml
      cloudcode = flags.cloudcode
    } else {
      let site = await this.askForSite()
      subdomain = site.subdomain
      haml = await this.askForHaml()
      cloudcode = await this.askForCloudCode()
    }

    await this.createDirectories(cloudcode, haml)
    await this.createConfig(subdomain)
  }

  private async askForSite() {
    cli.action.start('Please wait while we get the list of sites...')
    let sites = await this.nimbu.get<Nimbu.Site[]>('/sites', { fetchAll: true })
    cli.action.stop('done \n')

    if (sites.length === 0) {
      this.error("You don't have access to any Nimbu sites.", { exit: 101 })
    }

    if (sites.length > 1) {
      sites = orderBy(sites, [(site) => site.name.toLowerCase()], ['asc'])
      let choices = sites.map((s) => `${s.name} ${color.dim(`(${s.subdomain})`)}`)
      let fuzzy = require('fuzzy')
      let autocompletePrompt = require('inquirer-autocomplete-prompt')

      inquirer.registerPrompt('autocomplete', autocompletePrompt)
      let answer = await inquirer.prompt({
        type: 'autocomplete',
        name: 'site',
        message: 'On which site would you like to work?',
        source: async (_, input) => {
          input = input || ''
          return fuzzy.filter(input, choices).map((el) => el.original)
        },
      })
      return sites[choices.indexOf(answer.site)]
    } else {
      this.log(
        logSymbols.success,
        `You are only linked to ${color.bold(sites[0].name)}, so let's use that for this project.`,
      )

      return sites[0]
    }
  }

  private async askForHaml() {
    let answer = await inquirer.prompt({
      type: 'confirm',
      name: 'haml',
      message: 'Would you like to work with HAML?',
      default: true,
    })

    return answer.haml
  }

  private async askForCloudCode() {
    let answer = await inquirer.prompt({
      type: 'confirm',
      name: 'cloudcode',
      message: 'Will you work with cloud code?',
      default: true,
    })

    return answer.cloudcode
  }

  private async createDirectories(useCloudCode = false, useHaml = false) {
    const assets = ['stylesheets', 'javascripts', 'images']
    const templates = ['layouts', 'templates', 'snippets']

    let dirs = [...templates, ...assets]

    if (useHaml) {
      templates.forEach((t) => {
        dirs.push(`haml/${t}`)
      })
    }

    if (useCloudCode) {
      dirs.push('cloudcode')
    }

    this.log('\nInitializing directories:')
    const currentDir = process.cwd()
    dirs.sort().forEach(async (d) => {
      this.log(`- ${d}`)
      try {
        await fs.mkdirp(currentDir + '/' + d)
        // tslint:disable-next-line: no-unused
      } catch (error) {
        // do nothing
      }
    })

    this.log('\nDone.')
  }

  private async createConfig(subdomain) {
    const currentDir = process.cwd()
    const filename = currentDir + '/nimbu.yml'
    const content = `theme: default-theme\nsite: ${subdomain}`

    if (fs.existsSync(filename)) {
      let answer = await inquirer.prompt({
        type: 'confirm',
        name: 'overwrite',
        message: 'A nimbu.yml file already exists. Would you like to overwrite?',
        default: false,
      })

      if (!answer.overwrite) {
        return
      }
    }

    await fs.writeFile(filename, content)
  }
}
