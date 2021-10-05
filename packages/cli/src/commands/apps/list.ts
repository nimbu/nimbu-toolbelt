import Command from '../../command'
import * as Nimbu from '../../nimbu/types'
import { ConfigApp } from '../../nimbu/config'
import { groupBy } from 'lodash'
import chalk from 'chalk'

const enum Status {
  Configured = 'configured',
  Unconfigured = 'unconfigured',
}

export default class AppsList extends Command {
  static description = 'List the applications registered in Nimbu'

  printConfiguredApp(app: Nimbu.App, configured: ConfigApp) {
    this.log(chalk.bold(`- ${configured.name}`))
    this.log(`  - id: ${configured.id}`)
    this.log(`  - name in nimbu: ${app.name}`)
    this.log(`  - code directory: ${configured.dir}`)
    this.log(`  - code glob: ${configured.glob}`)
  }

  printUnconfiguredApp(app: Nimbu.App) {
    this.log(`- ${app.name}:`)
    this.log(`  - id: ${app.key}`)
  }

  async printUnconfiguredApps(apps: Nimbu.App[]) {
    if (apps && apps.length > 0) {
      this.log(chalk.greenBright('Unconfigured applications:'))
      apps.forEach((a) => this.printUnconfiguredApp(a))
    }
  }

  async printConfiguredApps(apps: Nimbu.App[], configured: ConfigApp[]) {
    if (apps && apps.length > 0) {
      this.log(chalk.greenBright('Configured applications:'))
      apps.forEach((a) => {
        this.printConfiguredApp(a, configured.find((ca) => ca.id === a.key)!)
      })
    }
  }

  async printApps(apps: Nimbu.App[]): Promise<void> {
    const configuredApps = this.nimbuConfig.apps
    const grouped = groupBy(apps, (a) => {
      if (configuredApps.find((ca) => ca.id === a.key)) {
        return Status.Configured
      } else {
        return Status.Unconfigured
      }
    })
    await this.printConfiguredApps(grouped[Status.Configured], configuredApps)
    await this.printUnconfiguredApps(grouped[Status.Unconfigured])
  }

  async execute() {
    const apps = await this.nimbu.get<Array<Nimbu.App>>('/apps')
    if (apps.length > 0) {
      await this.printApps(apps)
    } else {
      this.log('Your current site has no applications.')
    }
  }
}
