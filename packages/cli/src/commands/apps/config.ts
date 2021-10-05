import Command from '../../command'
import * as Nimbu from '../../nimbu/types'
import cli from 'cli-ux'
import { pathExists } from 'fs-extra'

export default class AppsList extends Command {
  static description = 'Add an app to the local configuration'

  removeConfigured(apps: Nimbu.App[]): Nimbu.App[] {
    const configuredIds = this.nimbuConfig.apps.map((a) => a.id)
    return apps.filter((a) => !configuredIds.includes(a.key))
  }

  async pickApp(apps: Nimbu.App[]): Promise<Nimbu.App> {
    apps.forEach((a, i) => {
      this.log(`[${i + 1}] ${a.name}`)
    })
    const answer = await cli.prompt('Which application do you want to configure?', {
      required: true,
      default: '1',
    })
    const picked = parseInt(answer, 10)
    if (!(!isNaN(picked) && picked > 0 && picked <= apps.length)) {
      this.error('Invalid application chosen')
    }
    return apps[picked - 1]
  }

  async configureApp(app: Nimbu.App): Promise<void> {
    const name = await cli.prompt(
      'Give this app a local name. Make it short and (white)spaceless! You might have to type it in apps:push commands.',
      {
        required: true,
        default: app.name.toLowerCase().replace(' ', '_'),
      },
    )
    const dir = await cli.prompt('Where is the code?', {
      required: true,
      default: 'code',
    })
    const glob = await cli.prompt('What files should be pushed?', {
      required: true,
      default: '*.js',
    })
    const dirExists = await pathExists(dir)
    if (dirExists || (await cli.confirm("Code directory doesn't exists, are you sure want to continue?"))) {
      await this.nimbuConfig.addApp({
        name,
        id: app.key,
        dir,
        glob,
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
}
