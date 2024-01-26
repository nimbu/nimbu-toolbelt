/* eslint-disable import/namespace */
import { APIError, Command } from '@nimbu-cli/command'
import { Flags, ux } from '@oclif/core'
import chalk from 'chalk'
import fm from 'front-matter'
import * as fs from 'fs-extra'
import logSymbols from 'log-symbols'
import path from 'node:path'

import { findMatchingFiles } from '../../utils/files'

export default class PushMails extends Command {
  static description = 'upload all notification templates'

  static flags = {
    only: Flags.string({
      char: 'o',
      description: 'the names of the templates to push online',
      multiple: true,
      required: false,
    }),
  }

  async execute() {
    await this.nimbu.validateLogin()

    const { flags } = await this.parse(PushMails)
    const mailsPath = this.nimbuConfig.projectPath + '/content/notifications/'

    if (!fs.existsSync(mailsPath)) {
      ux.error('Could not find ./content/notifications directory! Aborting...')
      return
    }

    const notifications = await findMatchingFiles(mailsPath, '*.txt')
    const allFiles = await findMatchingFiles(mailsPath, '**/*.txt')

    const translations = allFiles.filter((e) => {
      const i = notifications.indexOf(e)
      return i === -1
    })

    ux.log('Updating notifications:')

    for (const filename of notifications) {
      const slug = path.basename(filename, '.txt')
      if (flags.only && flags.only.length > 0 && !flags.only.includes(slug)) {
        continue
      }

      ux.action.start(` - ${slug} `)
      const raw = await fs.readFile(filename)
      let content: any
      try {
        content = fm(raw.toString('utf8'))
      } catch (error) {
        ux.action.stop(chalk.red(`${logSymbols.error} ${error}`))
        break
      }

      if (content.attributes.name == null) {
        ux.action.stop(chalk.red(`${logSymbols.error} name is missing!`))
        break
      }

      if (content.attributes.description == null) {
        ux.action.stop(chalk.red(`${logSymbols.error} description is missing!`))
        break
      }

      if (content.attributes.subject == null) {
        ux.action.stop(chalk.red(`${logSymbols.error} subject is missing!`))
        break
      }

      const body: any = {
        description: content.attributes.description,
        name: content.attributes.name,
        slug,
        subject: content.attributes.subject,
        text: content.body,
      }

      const htmlPath = `${mailsPath}${slug}.html`
      if (fs.existsSync(htmlPath)) {
        body.html_enabled = true
        const html = await fs.readFile(htmlPath)
        body.html = html.toString('utf8')
      }

      const applicableTranslations = translations.filter((f) => f.includes(`${slug}.txt`))
      const translationData = {}

      for (const translationFilename of applicableTranslations) {
        const locale = translationFilename.replace(mailsPath, '').replace(`/${slug}.txt`, '')
        if (this.nimbuConfig.possibleLocales.includes(locale)) {
          const raw = await fs.readFile(translationFilename)
          const content: any = fm(raw.toString('utf8'))

          const translation: any = {
            text: content.body,
          }

          if (content.attributes.subject !== undefined) {
            translation.subject = content.attributes.subject
          }

          const htmlPath = `${mailsPath}${locale}/${slug}.html`
          if (fs.existsSync(htmlPath)) {
            const html = await fs.readFile(htmlPath)
            translation.html = html.toString('utf8')
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
        if (error instanceof APIError) {
          ux.action.stop(chalk.red(`${logSymbols.error} ${error.message}`))
        } else {
          throw error
        }
      }

      ux.action.stop(chalk.green(`${logSymbols.success} done!`))
    }
  }
}
