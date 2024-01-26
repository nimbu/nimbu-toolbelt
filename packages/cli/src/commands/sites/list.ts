import { Command, APITypes as Nimbu, color } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import { orderBy } from 'lodash'

export default class SitesList extends Command {
  static aliases = ['sites']
  static description = 'list sites you can edit'
  static flags = {
    subdomain: Flags.boolean({ char: 's', description: 'show Nimbu subdomain for each site' }),
  }

  get needsConfig(): boolean {
    return false
  }

  async execute() {
    const { flags } = await this.parse(SitesList)
    const supports = require('supports-hyperlinks')
    const hyperlinker = require('hyperlinker')
    const protocol = this.nimbuConfig.secureHost ? 'https://' : 'http://'
    const adminDomain = this.nimbuConfig.apiHost.replace(/^api\./, '')

    ux.action.start('Please wait while we get the list of sites...')
    let sites = await this.nimbu.get<Nimbu.Site[]>('/sites', { fetchAll: true })
    ux.action.stop()

    if (sites && sites.length > 0) {
      this.log('\nYou have access to following sites:\n')

      sites = orderBy(sites, [(site) => site.name.toLowerCase()], ['asc'])
      const columns: ux.Table.table.Columns<Nimbu.Site> = {
        name: {
          get: (row) => (row.name.length > 30 ? row.name.slice(0, 40).trim() + '...' : row.name),
          header: 'Site Name',
        },
        url: {
          get(row) {
            if (supports.stdout) {
              return hyperlinker(color.dim(row.domain), row.domain_url)
            }

            return color.dim(row.domain)
          },
          header: 'Primary Domain',
        },
      }

      if (flags.subdomain) {
        columns.subdomain = {
          get(row) {
            if (supports.stdout) {
              return hyperlinker(color.dim(row.subdomain), protocol + row.subdomain + '.' + adminDomain + '/admin')
            }

            return color.dim(row.subdomain)
          },
          header: 'Admin Subdomain',
        }
      }

      ux.table(sites, columns)
    } else {
      this.log("\nYou don't have access to any sites.\n")
    }
  }
}
