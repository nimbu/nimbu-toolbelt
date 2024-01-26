import { APIError, Command } from '@nimbu-cli/command'
import { Args, Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import { Observable } from 'rxjs'

const timeUnitMapping = {
  d: 24 * 60 * 60,
  h: 60 * 60,
  m: (365.25 / 12) * 24 * 60 * 60,
  min: 60,
  s: 1,
  w: 7 * 24 * 60 * 60,
  y: 365.25 * 24 * 60 * 60,
}
export default class CopyTranslations extends Command {
  static args = {
    query: Args.string({
      default: '*',
      description: 'query to match subset of translations to be copied',
      name: 'query',
      required: false,
    }),
  }

  static description = 'copy translations from one site to another'

  static flags = {
    'dry-run': Flags.boolean({
      description: 'log which translations would be copied without actually copying them',
    }),
    from: Flags.string({
      char: 'f', // shorter flag version
      description: 'subdomain of the source site',
    }),
    fromHost: Flags.string({
      description: 'hostname of origin Nimbu API',
    }),
    since: Flags.string({
      char: 's', // shorter flag version
      description:
        'copy translations updated since the given date (use ISO 8601 format or a time unit like 1d, 1w, 1m, 1y)',
      async parse(input) {
        const match = input.match(/(?<number>\d*)(?<unit>[dhimnswy|])/)
        if (match) {
          const { number, unit } = match.groups as any
          const offset = number * timeUnitMapping[unit] * 1000
          return new Date(Date.now() - offset).toISOString()
        }

        return new Date(input).toISOString()
      },
    }),
    to: Flags.string({
      char: 't', // shorter flag version
      description: 'subdomain of the destination site',
    }),
    toHost: Flags.string({
      description: 'hostname of target Nimbu API',
    }),
  }

  async execute() {
    const Listr = require('listr')
    const ListrMultilineRenderer = require('listr-multiline-renderer')
    const { args, flags } = await this.parse(CopyTranslations)

    const fromSite = flags.from === undefined ? this.nimbuConfig.site : flags.from
    const toSite = flags.to === undefined ? this.nimbuConfig.site : flags.to
    const fromHost = flags.fromHost === undefined ? this.nimbuConfig.apiUrl : flags.fromHost
    const toHost = flags.toHost === undefined ? this.nimbuConfig.apiUrl : flags.toHost

    if (fromSite === toSite) {
      ux.error('The source site needs to differ from the destination.')
    }

    if (fromSite == null || toSite == null) {
      ux.error('You need to specify both the source and destination site.')
    }

    const fetchTitle = `Querying translations from site ${chalk.bold(fromSite)}`
    const createTitle = `Copying translations to site ${chalk.bold(toSite)}`

    const tasks = new Listr(
      [
        {
          task: (ctx) => this.fetchTranslations(ctx),
          title: fetchTitle,
        },
        {
          skip(ctx) {
            if (ctx.translations.length === 0) return true
            if (ctx.dryRun) {
              const nbtranslations = ctx.translations.length
              const dryRunLogs: string[] = []
              let crntIndex = 1
              for (const translation of ctx.translations) {
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
          task: (ctx) => this.createTranslations(ctx),
          title: createTitle,
        },
      ],
      {
        renderer: ListrMultilineRenderer,
      },
    )

    await tasks
      .run({
        dryRun: flags['dry-run'],
        files: {},
        fromHost,
        fromSite,
        query: args.query,
        since: flags.since,
        toHost,
        toSite,
      })
      .catch((error) => this.error(error))
  }

  private async createTranslations(ctx: any) {
    const perform = async (observer) => {
      let crntIndex = 1

      const nbtranslations = ctx.translations.length
      for (const translation of ctx.translations) {
        try {
          observer.next(`[${crntIndex}/${nbtranslations}] Copying translation ${translation.key} to site ${ctx.toSite}`)
          await this.nimbu.post(`/translations`, {
            body: translation,
            host: ctx.toHost,
            site: ctx.toSite,
          })
        } catch (error) {
          const error_ =
            error instanceof APIError
              ? new Error(`Error for translations ${chalk.bold(translation.key)}: ${error.message}`)
              : error
          throw error_
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

  private async fetchTranslations(ctx: any) {
    const options: any = { fetchAll: true }
    if (ctx.fromSite != null) {
      options.site = ctx.fromSite
      options.host = ctx.fromHost
    }

    try {
      let query = ''
      const queryParts: string[] = []
      if (ctx.query === '*') {
        // fetch all translations
      } else if (ctx.query.includes('*')) {
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
        throw new TypeError(error.message)
      }
    }
  }
}
