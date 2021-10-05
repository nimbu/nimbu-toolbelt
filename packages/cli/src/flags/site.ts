import { flags } from '@oclif/command'
import { SiteCompletion } from './completions'

export const site = flags.build({
  char: 's',
  completion: SiteCompletion,
  description: 'site to run command against',

  default: () => {
    const envSite = process.env.NIMBU_SITE
    if (envSite) return envSite
  },
})
