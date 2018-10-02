import Command from '../base';
import { App } from '../../nimbu/types';
import Config, { ConfigApp } from '../../nimbu/config';
import { groupBy } from 'lodash';
import chalk from 'chalk';

enum Status {
  Configured = 'configured',
  Unconfigured = 'unconfigured',
}

export default class AppsList extends Command {
  static description = 'List the applications registered in Nimbu';

  printConfiguredApp(app: App, configured: ConfigApp) {
    this.log(chalk.bold(`- ${configured.name}`));
    this.log(`  - id: ${configured.id}`);
    this.log(`  - name in nimbu: ${app.name}`);
    this.log(`  - code directory: ${configured.dir}`);
    this.log(`  - code glob: ${configured.glob}`);
  }

  printUnconfiguredApp(app: App) {
    this.log(`- ${app.name}:`);
    this.log(`  - id: ${app.key}`);
  }

  async printUnconfiguredApps(apps: App[]) {
    if (apps.length > 0) {
      this.log(chalk.greenBright('Unconfigured applications:'));
      apps.forEach(a => this.printUnconfiguredApp(a));
    }
  }

  async printConfiguredApps(apps: App[], configured: ConfigApp[]) {
    if (apps.length > 0) {
      this.log(chalk.greenBright('Configured applications:'));
      apps.forEach(a => {
        this.printConfiguredApp(a, configured.find(ca => ca.id === a.key)!);
      });
    }
  }

  async printApps(apps: App[]): Promise<void> {
    const configuredApps = Config.apps;
    const grouped = groupBy(apps, a => {
      if (configuredApps.find(ca => ca.id === a.key)) {
        return Status.Configured;
      } else {
        return Status.Unconfigured;
      }
    });
    await this.printConfiguredApps(grouped[Status.Configured], configuredApps);
    await this.printUnconfiguredApps(grouped[Status.Unconfigured]);
  }

  async run() {
    const apps = await this.client.listApps();
    if (apps.length > 0) {
      await this.printApps(apps);
    } else {
      this.log('Your current site has no applications.');
    }
  }
}
