import { Interfaces } from '@oclif/core'
import Client from '../nimbu/client'
import buildConfig = require('../config/config')
import { Config as NimbuConfig } from '../nimbu/config'

const day = 60 * 60 * 24

const fetchFromNimbu = async (
  resource: string,
  ctx: { config: Interfaces.Config },
  sortParam = 'name',
): Promise<string[]> => {
  const bConf = await buildConfig.initialize()
  const nConf = new NimbuConfig(bConf)
  const nimbu = new Client(ctx.config, nConf)

  let resources = await nimbu.get<any>(`/${resource}`, { fetchAll: true })

  if (typeof resources === 'string') resources = JSON.parse(resources)
  return resources.map((a: any) => a[sortParam]).sort()
}

// FIXME: this worked before oclif@2
// export const SiteCompletion: Interfaces.Completion = {
//   cacheDuration: day,
//   options: async (ctx) => {
//     let sites = await fetchFromNimbu('sites', ctx)
//     return sites
//   },
// }

// export const SiteSubdomainCompletion: Interfaces.Completion = {
//   skipCache: true,
//   options: async (_) => {
//     return ['a', 'b', 'c']

//     // let sites = await fetchFromNimbu('sites', ctx, 'subdomain')
//     // return sites
//   },
// }
