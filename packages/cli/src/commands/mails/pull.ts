import Command, { APITypes as Nimbu } from '@nimbu-cli/command'

import { flags } from '@oclif/command'
import fs from 'fs-extra'
import ux from 'cli-ux'
import yaml from 'js-yaml'

export default class PullMails extends Command {
  static description = 'download all notification templates'

  static flags = {
    only: flags.string({
      char: 'o',
      description: 'the names of the templates to pull from Nimbu',
      multiple: true,
      required: false,
    }),
  }

  async execute() {
    const Listr = require('listr')

    const { flags } = this.parse(PullMails)

    const tasks = new Listr([
      {
        title: 'Fetching notifications',
        task: (ctx) => this.fetchAll(ctx),
      },
      {
        title: 'Writing all templates to disk',
        task: (ctx) => this.writeAll(ctx, flags),
      },
    ])

    tasks.run().catch((err) => {
      ux.error(err)
    })
  }

  private async fetchAll(ctx: any) {
    ctx.notifications = await this.nimbu.get<Nimbu.Notification[]>('/notifications')
  }

  private async writeAll(ctx: any, flags: any) {
    const { Observable } = require('rxjs')
    const notifications: Nimbu.Notification[] = ctx.notifications
    const mailsPath = this.nimbuConfig.projectPath + '/content/notifications/'

    await fs.mkdirp(mailsPath)

    return new Observable((observer) => {
      notifications.forEach((notification) => {
        if (flags.only && flags.only.length > 0 && flags.only.indexOf(notification.slug) === -1) {
          return
        }

        let filename = `${notification.slug}.txt`
        observer.next(filename)

        let fm = yaml.dump({
          name: notification.name,
          description: notification.description,
          subject: notification.subject,
        })

        let content = '---\n' + fm + '---\n\n' + notification.text
        fs.writeFileSync(mailsPath + filename, content)

        if (notification.html_enabled && notification.html) {
          filename = `${notification.slug}.html`
          fs.writeFileSync(mailsPath + filename, notification.html!)
        }

        if (notification.translations !== undefined) {
          Object.keys(notification.translations).forEach(function (locale) {
            let translation = notification.translations![locale]

            if (
              translation.text !== notification.text ||
              translation.html !== notification.html ||
              translation.subject !== notification.subject
            ) {
              let localePath = mailsPath + locale
              fs.mkdirpSync(localePath)

              filename = `${notification.slug}.txt`
              let fm = yaml.dump({
                subject: translation.subject,
              })

              let content = '---\n' + fm + '---\n\n' + translation.text
              fs.writeFileSync(localePath + '/' + filename, content)

              if (notification.html_enabled && translation.html) {
                filename = `${notification.slug}.html`
                fs.writeFileSync(localePath + '/' + filename, translation.html!)
              }
            }
          })
        }
      })

      observer.complete()
    })
  }
}
