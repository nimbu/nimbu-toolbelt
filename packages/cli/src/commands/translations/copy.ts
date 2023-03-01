import Command, { APIError } from '@nimbu-cli/command'
import { Args, Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import { Observable } from 'rxjs'

const timeUnitMapping = {
  s: 1,
  min: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
  w: 7 * 24 * 60 * 60,
  m: (365.25 / 12) * 24 * 60 * 60,
  y: 365.25 * 24 * 60 * 60,
}
export default class CopyTranslations extends Command {
  static description = 'copy translations from one site to another'

  static args = {
    query: Args.string({
      name: 'query',
      required: false,
      description: 'query to match subset of translations to be copied',
      default: '*',
    }),
  }

  static flags = {
    from: Flags.string({
      char: 'f', // shorter flag version
      description: 'subdomain of the source site',
    }),
    to: Flags.string({
      char: 't', // shorter flag version
      description: 'subdomain of the destination site',
    }),
    since: Flags.string({
      char: 's', // shorter flag version
      description:
        'copy translations updated since the given date (use ISO 8601 format or a time unit like 1d, 1w, 1m, 1y)',
      parse: async (input) => {
        const match = input.match(/(?<number>[0-9]*)(?<unit>[s|min|h|d|w|m|y])/)
        if (match) {
          const { number, unit } = match.groups as any
          const offset = number * timeUnitMapping[unit] * 1000
          return new Date(Date.now() - offset).toISOString()
        } else {
          return new Date(input).toISOString()
        }
      },
    }),
    toHost: Flags.string({
      description: 'hostname of target Nimbu API',
    }),
    fromHost: Flags.string({
      description: 'hostname of origin Nimbu API',
    }),
    'dry-run': Flags.boolean({
      description: 'log which translations would be copied without actually copying them',
    }),
  }

  async execute() {
    const Listr = require('listr')
    const ListrMultilineRenderer = require('listr-multiline-renderer')
    const { flags, args } = await this.parse(CopyTranslations)

    let fromSite = flags.from !== undefined ? flags.from! : this.nimbuConfig.site!
    let toSite = flags.to !== undefined ? flags.to! : this.nimbuConfig.site!
    let fromHost = flags.fromHost !== undefined ? flags.fromHost! : this.nimbuConfig.apiUrl
    let toHost = flags.toHost !== undefined ? flags.toHost! : this.nimbuConfig.apiUrl

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
    }

    let fetchTitle = `Querying translations from site ${chalk.bold(fromSite)}`
    let createTitle = `Copying translations to site ${chalk.bold(toSite)}`

    const tasks = new Listr(
      [
        {
          title: fetchTitle,
          task: (ctx) => this.fetchTranslations(ctx),
        },
        {
          title: createTitle,
          task: (ctx) => this.createTranslations(ctx),
          skip: (ctx) => {
            if (ctx.translations.length === 0) return true
            if (ctx.dryRun) {
              const nbtranslations = ctx.translations.length
              const dryRunLogs: string[] = []
              let crntIndex = 1
              for (let translation of ctx.translations) {
                dryRunLogs.push(
                  `[${crntIndex}/${nbtranslations}] Dry-run: would copy translation ${chalk.bold(
                    translation.key,
                  )} to ${chalk.bold(ctx.toSite)}`,
                )
                crntIndex++
              }
              return dryRunLogs.join('\n')
            }
          },
        },
      ],
      {
        renderer: ListrMultilineRenderer,
      },
    )

    await tasks
      .run({
        fromSite,
        toSite,
        fromHost,
        toHost,
        files: {},
        query: args.query,
        since: flags.since,
        dryRun: flags['dry-run'],
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
      let queryParts: string[] = []
      if (ctx.query === '*') {
        // fetch all translations
      } else if (ctx.query.indexOf('*') !== -1) {
        queryParts.push(`key.start=${ctx.query.replace('*', '')}`)
      } else {
        queryParts.push(`key=${ctx.query}`)
      }

      if (ctx.since != null) {
        queryParts.push(`updated_at.gte=${ctx.since}`)
      }

      if (queryParts.length > 0) {
        query = `?${queryParts.join('&')}`
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
