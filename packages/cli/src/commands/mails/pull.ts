/* eslint-disable import/namespace */
import { Command, APITypes as Nimbu } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import * as fs from 'fs-extra'
import yaml from 'js-yaml'

export default class PullMails extends Command {
  static description = 'download all notification templates'

  static flags = {
    only: Flags.string({
      char: 'o',
      description: 'the names of the templates to pull from Nimbu',
      multiple: true,
      required: false,
    }),
  }

  async execute() {
    const Listr = require('listr')

    const { flags } = await this.parse(PullMails)

    const tasks = new Listr([
      {
        task: (ctx) => this.fetchAll(ctx),
        title: 'Fetching notifications',
      },
      {
        task: (ctx) => this.writeAll(ctx, flags),
        title: 'Writing all templates to disk',
      },
    ])

    tasks.run().catch((error) => {
      ux.error(error)
    })
  }

  private async fetchAll(ctx: any) {
    ctx.notifications = await this.nimbu.get<Nimbu.Notification[]>('/notifications')
  }

  private async writeAll(ctx: any, flags: any) {
    const { Observable } = require('rxjs')
    const { notifications } = ctx
    const mailsPath = this.nimbuConfig.projectPath + '/content/notifications/'

    await fs.mkdirp(mailsPath)

    return new Observable((observer) => {
      for (const notification of notifications) {
        if (flags.only && flags.only.length > 0 && !flags.only.includes(notification.slug)) {
          continue
        }

        let filename = `${notification.slug}.txt`
        observer.next(filename)

        const fm = yaml.dump({
          description: notification.description,
          name: notification.name,
          subject: notification.subject,
        })

        const content = '---\n' + fm + '---\n\n' + notification.text
        fs.writeFileSync(mailsPath + filename, content)

        if (notification.html_enabled && notification.html) {
          filename = `${notification.slug}.html`
          fs.writeFileSync(mailsPath + filename, notification.html)
        }

        if (notification.translations !== undefined) {
          for (const locale of Object.keys(notification.translations)) {
            const translation = notification.translations[locale]

            if (
              translation.text !== notification.text ||
              translation.html !== notification.html ||
              translation.subject !== notification.subject
            ) {
              const localePath = mailsPath + locale
              fs.mkdirpSync(localePath)

              filename = `${notification.slug}.txt`
              const fm = yaml.dump({
                subject: translation.subject,
              })

              const content = '---\n' + fm + '---\n\n' + translation.text
              fs.writeFileSync(localePath + '/' + filename, content)

              if (notification.html_enabled && translation.html) {
                filename = `${notification.slug}.html`
                fs.writeFileSync(localePath + '/' + filename, translation.html)
              }
            }
          }
        }
      }

      observer.complete()
    })
  }
}
