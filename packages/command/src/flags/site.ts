import { Flags } from '@oclif/core'
// import { SiteCompletion } from './completions'

export const site = Flags.custom({
  char: 's',
  // completion: SiteCompletion, FIXME: this worked before oclif@2

  async default() {
    const envSite = process.env.NIMBU_SITE
    if (envSite) return envSite
  },

  description: 'site to run command against',
})
