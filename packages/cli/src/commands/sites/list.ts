import Command from '../../command'
import * as Nimbu from '../../nimbu/types'
import { color } from '../../nimbu/color'

import cli from 'cli-ux'
import { flags } from '@oclif/command'
import { orderBy } from 'lodash'
import { table } from 'cli-ux/lib/styled/table'

export default class SitesList extends Command {
  static description = 'list sites you can edit'
  static aliases = ['sites']
  static flags = {
    subdomain: flags.boolean({ char: 's', description: 'show Nimbu subdomain for each site' }),
  }

  async execute() {
    const { flags } = this.parse(SitesList)
    const supports = require('supports-hyperlinks')
    const hyperlinker = require('hyperlinker')
    const protocol = this.nimbuConfig.secureHost ? 'https://' : 'http://'
    const adminDomain = this.nimbuConfig.apiHost.replace(/^api\./, '')

    cli.action.start('Please wait while we get the list of sites...')
    let sites = await this.nimbu.get<Nimbu.Site[]>('/sites', { fetchAll: true })
    cli.action.stop()

    if (sites && sites.length > 0) {
      this.log('\nYou have access to following sites:\n')

      sites = orderBy(sites, [(site) => site.name.toLowerCase()], ['asc'])
      let columns: table.Columns<Nimbu.Site> = {
        name: {
          header: 'Site Name',
          get: (row) => (row.name.length > 30 ? row.name.substring(0, 40).trim() + '...' : row.name),
        },
        url: {
          header: 'Primary Domain',
          get: (row) => {
            if (supports.stdout) {
              return hyperlinker(color.dim(row.domain), row.domain_url)
            } else {
              return color.dim(row.domain)
            }
          },
        },
      }

      if (flags.subdomain) {
        columns.subdomain = {
          header: 'Admin Subdomain',
          get: (row) => {
            if (supports.stdout) {
              return hyperlinker(color.dim(row.subdomain), protocol + row.subdomain + '.' + adminDomain + '/admin')
            } else {
              return color.dim(row.subdomain)
            }
          },
        }
      }
      cli.table(sites, columns)
    } else {
      this.log("\nYou don't have access to any sites.\n")
    }
  }
}
