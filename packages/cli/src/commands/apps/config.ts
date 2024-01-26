import { Command, APITypes as Nimbu } from '@nimbu-cli/command'
import { ux } from '@oclif/core'
import { pathExists } from 'fs-extra'

export default class AppsList extends Command {
  static description = 'Add an app to the local configuration'

  async configureApp(app: Nimbu.App): Promise<void> {
    const name = await ux.prompt(
      'Give this app a local name. Make it short and (white)spaceless! You might have to type it in apps:push commands.',
      {
        default: app.name.toLowerCase().replace(' ', '_'),
        required: true,
      },
    )
    const dir = await ux.prompt('Where is the code?', {
      default: 'code',
      required: true,
    })
    const glob = await ux.prompt('What files should be pushed?', {
      default: '*.js',
      required: true,
    })
    const dirExists = await pathExists(dir)
    if (dirExists || (await ux.confirm("Code directory doesn't exists, are you sure want to continue?"))) {
      await this.nimbuConfig.addApp({
        dir,
        glob,
        id: app.key,
        name,
      })
    }
  }

  async execute() {
    const apps = await this.nimbu.get<Array<Nimbu.App>>('/apps')
    const unConfigured = this.removeConfigured(apps)
    if (unConfigured.length > 0) {
      const app = await this.pickApp(unConfigured)
      await this.configureApp(app)
    } else if (unConfigured.length === 0) {
      this.error("All your site's app are already configured.")
    } else {
      this.error("Your site doesn't have apps yet.")
    }
  }

  async pickApp(apps: Nimbu.App[]): Promise<Nimbu.App> {
    for (const [i, a] of apps.entries()) {
      this.log(`[${i + 1}] ${a.name}`)
    }

    const answer = await ux.prompt('Which application do you want to configure?', {
      default: '1',
      required: true,
    })
    const picked = Number.parseInt(answer, 10)
    if (!(!Number.isNaN(picked) && picked > 0 && picked <= apps.length)) {
      this.error('Invalid application chosen')
    }

    return apps[picked - 1]
  }

  removeConfigured(apps: Nimbu.App[]): Nimbu.App[] {
    const configuredIds = new Set(this.nimbuConfig.apps.map((a) => a.id))
    return apps.filter((a) => !configuredIds.has(a.key))
  }
}
