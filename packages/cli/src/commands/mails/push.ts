import Command from '../../command'

import { findMatchingFiles } from '../../utils/files'

import { flags } from '@oclif/command'
import fs from 'fs-extra'
import ux from 'cli-ux'
import chalk from 'chalk'
import path from 'path'
import fm from 'front-matter'
import logSymbols from 'log-symbols'

export default class PushMails extends Command {
  static description = 'upload all notification templates'

  static flags = {
    only: flags.string({
      char: 'o',
      description: 'the names of the templates to push online',
      multiple: true,
      required: false,
    }),
  }

  async execute() {
    await this.nimbu.validateLogin()

    const { flags } = this.parse(PushMails)
    const mailsPath = this.nimbuConfig.projectPath + '/content/notifications/'

    if (!fs.existsSync(mailsPath)) {
      ux.error('Could not find ./content/notifications directory! Aborting...')
      return
    }

    let notifications = await findMatchingFiles(mailsPath, '*.txt')
    let allFiles = await findMatchingFiles(mailsPath, '**/*.txt')

    let translations = allFiles.filter(function (e) {
      let i = notifications.indexOf(e)
      if (i === -1) {
        return true
      } else {
        return false
      }
    })

    ux.log('Updating notifications:')

    for (let filename of notifications) {
      let slug = path.basename(filename, '.txt')
      if (flags.only && flags.only.length > 0 && flags.only.indexOf(slug) === -1) {
        continue
      }
      ux.action.start(` - ${slug} `)
      let raw = await fs.readFile(filename)
      let content: any
      try {
        content = fm(raw.toString('utf-8'))
      } catch (error) {
        ux.action.stop(chalk.red(`${logSymbols.error} ${error}`))
        break
      }

      if (content.attributes.name == undefined) {
        ux.action.stop(chalk.red(`${logSymbols.error} name is missing!`))
        break
      }

      if (content.attributes.description == undefined) {
        ux.action.stop(chalk.red(`${logSymbols.error} description is missing!`))
        break
      }

      if (content.attributes.subject == undefined) {
        ux.action.stop(chalk.red(`${logSymbols.error} subject is missing!`))
        break
      }

      let body: any = {
        slug,
        name: content.attributes.name,
        description: content.attributes.description,
        subject: content.attributes.subject,
        text: content.body,
      }

      let htmlPath = `${mailsPath}${slug}.html`
      if (fs.existsSync(htmlPath)) {
        body.html_enabled = true
        let html = await fs.readFile(htmlPath)
        body.html = html.toString('utf-8')
      }

      let applicableTranslations = translations.filter((f) => f.includes(`${slug}.txt`))
      let translationData = {}

      for (let translationFilename of applicableTranslations) {
        let locale = translationFilename.replace(mailsPath, '').replace(`/${slug}.txt`, '')
        if (this.nimbuConfig.possibleLocales.includes(locale)) {
          let raw = await fs.readFile(translationFilename)
          let content: any = fm(raw.toString('utf-8'))

          let translation: any = {
            text: content.body,
          }

          if (content.attributes.subject !== undefined) {
            translation.subject = content.attributes.subject
          }

          let htmlPath = `${mailsPath}${locale}/${slug}.html`
          if (fs.existsSync(htmlPath)) {
            let html = await fs.readFile(htmlPath)
            translation.html = html.toString('utf-8')
          }

          translationData[locale] = translation
        }
      }

      if (Object.keys(translationData).length > 0) {
        body.translations = translationData
      }

      try {
        await this.nimbu.post('/notifications', { body })
      } catch (error) {
        ux.action.stop(chalk.red(`${logSymbols.error} ${error.message}`))
      }

      ux.action.stop(chalk.green(`${logSymbols.success} done!`))
    }
  }
}
