import Command from '../../command'

import Config from '../../nimbu/config'
import { findMatchingFiles } from '../../utils/files'

import fs from 'fs-extra'
import ux from 'cli-ux'
import chalk from 'chalk'
import path from 'path'
import fm from 'front-matter'
import logSymbols from 'log-symbols'

export default class PushMails extends Command {
  static description = 'upload all notification templates'

  async run() {
    await this.nimbu.validateLogin()

    const mailsPath = Config.projectPath + '/content/notifications/'

    if (!fs.existsSync(mailsPath)) {
      ux.error('Could not find ./content/notifications directory! Aborting...')
      return
    }

    let notifications = await findMatchingFiles(mailsPath, '*.txt')
    let allFiles = await findMatchingFiles(mailsPath, '**/*.txt')

    let translations = allFiles.filter(function(e) {
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
      ux.action.start(` - ${slug} `)
      let raw = await fs.readFile(filename)
      let content: any = fm(raw.toString('utf-8'))

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

      let applicableTranslations = translations.filter(f => f.includes(`${slug}.txt`))
      let translationData = {}

      for (let translationFilename of applicableTranslations) {
        let locale = translationFilename.replace(mailsPath, '').replace(`/${slug}.txt`, '')
        if (Config.possibleLocales.includes(locale)) {
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

      await this.nimbu.post('/notifications', { body })

      ux.action.stop(chalk.green(`${logSymbols.success} done!`))
    }
  }
}