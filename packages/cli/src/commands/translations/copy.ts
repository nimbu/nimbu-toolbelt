import Command, { APIError } from '@nimbu-cli/command'

import { CliUx, Flags } from '@oclif/core'
import chalk from 'chalk'
import { Observable } from 'rxjs'

export default class CopyTranslations extends Command {
  static description = 'copy translations from one site to another'

  static args = [
    {
      name: 'query',
      required: false,
      description: 'query to match subset of translations to be copied',
      default: '*',
    },
  ]

  static flags = {
    from: Flags.string({
      char: 'f', // shorter flag version
      description: 'subdomain of the source site',
    }),
    to: Flags.string({
      char: 't', // shorter flag version
      description: 'subdomain of the destination site',
    }),
    toHost: Flags.string({
      description: 'hostname of target Nimbu API',
    }),
    fromHost: Flags.string({
      description: 'hostname of origin Nimbu API',
    }),
  }

  async execute() {
    const Listr = require('listr')
    const { flags, args } = await this.parse(CopyTranslations)

    let fromSite = flags.from !== undefined ? flags.from! : this.nimbuConfig.site!
    let toSite = flags.to !== undefined ? flags.to! : this.nimbuConfig.site!
    let fromHost = flags.fromHost !== undefined ? flags.fromHost! : this.nimbuConfig.apiUrl
    let toHost = flags.toHost !== undefined ? flags.toHost! : this.nimbuConfig.apiUrl

    if (fromSite === toSite) {
      CliUx.ux.error('The source site needs to differ from the destination.')
      return
    }

    let fetchTitle = `Querying translations from site ${chalk.bold(fromSite)}`
    let createTitle = `Copying translations to site ${chalk.bold(toSite)}`

    const tasks = new Listr([
      {
        title: fetchTitle,
        task: (ctx) => this.fetchTranslations(ctx),
      },
      {
        title: createTitle,
        task: (ctx) => this.createTranslations(ctx),
        skip: (ctx) => ctx.translations.length === 0,
      },
    ])

    tasks
      .run({
        fromSite,
        toSite,
        fromHost,
        toHost,
        files: {},
        query: args.query,
      })
      .catch((error) => this.error(error))
  }

  private async fetchTranslations(ctx: any) {
    let options: any = { fetchAll: true }
    if (ctx.fromSite != null) {
      options.site = ctx.fromSite
      options.host = ctx.fromHost
    }
    try {
      let query = ''
      if (ctx.query === '*') {
        // fetch all translations
      } else if (ctx.query.indexOf('*') !== -1) {
        query = `?key.start=${ctx.query.replace('*', '')}`
      } else {
        query = `?key=${ctx.query}`
      }
      ctx.translations = await this.nimbu.get(`/translations${query}`, options)
    } catch (error) {
      if (error instanceof APIError && error.body != null && error.body.code === 101) {
        throw new Error(`could not find any translations matching ${chalk.bold(ctx.query)}`)
      } else if (error instanceof Error) {
        throw new Error(error.message)
      }
    }
  }

  private async createTranslations(ctx: any) {
    const perform = async (observer) => {
      let crntIndex = 1

      const nbtranslations = ctx.translations.length
      for (let translation of ctx.translations) {
        try {
          observer.next(`[${crntIndex}/${nbtranslations}] Copying translation ${translation.key} to site ${ctx.toSite}`)
          await this.nimbu.post(`/translations`, {
            body: translation,
            site: ctx.toSite,
            host: ctx.toHost,
          })
        } catch (error) {
          if (error instanceof APIError) {
            throw new Error(`Error for translations ${chalk.bold(translation.key)}: ${error.message}`)
          } else {
            throw error
          }
        }

        crntIndex++
      }
    }

    return new Observable((observer) => {
      perform(observer)
        .then(() => observer.complete())
        .catch((error) => observer.error(error))
    })
  }
}
