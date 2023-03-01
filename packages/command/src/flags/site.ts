import { Flags } from '@oclif/core'
// import { SiteCompletion } from './completions'

export const site = Flags.custom({
  char: 's',
  // completion: SiteCompletion, FIXME: this worked before oclif@2
  description: 'site to run command against',

  default: async () => {
    const envSite = process.env.NIMBU_SITE
    if (envSite) return envSite
  },
})
