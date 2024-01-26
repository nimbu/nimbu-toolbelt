import { AppConfig, Command, APITypes as Nimbu } from '@nimbu-cli/command'
import chalk from 'chalk'
import { groupBy } from 'lodash'

const enum Status {
  Configured = 'configured',
  Unconfigured = 'unconfigured',
}

export default class AppsList extends Command {
  static description = 'List the applications registered in Nimbu'

  async execute() {
    const apps = await this.nimbu.get<Array<Nimbu.App>>('/apps')
    if (apps.length > 0) {
      await this.printApps(apps)
    } else {
      this.log('Your current site has no applications.')
    }
  }

  async printApps(apps: Nimbu.App[]): Promise<void> {
    const configuredApps = this.nimbuConfig.apps
    const grouped = groupBy(apps, (a) => {
      if (configuredApps.some((ca) => ca.id === a.key)) {
        return Status.Configured
      }

      return Status.Unconfigured
    })
    await this.printConfiguredApps(grouped[Status.Configured], configuredApps)
    await this.printUnconfiguredApps(grouped[Status.Unconfigured])
  }

  printConfiguredApp(app: Nimbu.App, configured: AppConfig) {
    this.log(chalk.bold(`- ${configured.name}`))
    this.log(`  - id: ${configured.id}`)
    this.log(`  - name in nimbu: ${app.name}`)
    this.log(`  - code directory: ${configured.dir}`)
    this.log(`  - code glob: ${configured.glob}`)
  }

  async printConfiguredApps(apps: Nimbu.App[], configured: AppConfig[]) {
    if (apps && apps.length > 0) {
      this.log(chalk.greenBright('Configured applications:'))
      for (const a of apps) {
        const appConfig = configured.find((ca) => ca.id === a.key)
        if (!appConfig) continue
        this.printConfiguredApp(a, appConfig)
      }
    }
  }

  printUnconfiguredApp(app: Nimbu.App) {
    this.log(`- ${app.name}:`)
    this.log(`  - id: ${app.key}`)
  }

  async printUnconfiguredApps(apps: Nimbu.App[]) {
    if (apps && apps.length > 0) {
      this.log(chalk.greenBright('Unconfigured applications:'))
      for (const a of apps) this.printUnconfiguredApp(a)
    }
  }
}
