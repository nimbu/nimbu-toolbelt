import { flags } from '@oclif/command'
import * as Config from '@oclif/config'
import Client from '../nimbu/client'
import buildConfig = require('../config/config')
import NimbuConfig from '../nimbu/config'

export const day = 60 * 60 * 24

export const fetchFromNimbu = async (
  resource: string,
  ctx: { config: Config.IConfig },
  sortParam = 'name',
): Promise<string[]> => {
  const bConf = await buildConfig.initialize()
  const nConf = new NimbuConfig(bConf)
  const nimbu = new Client(ctx.config, nConf)

  let resources = await nimbu.get<any>(`/${resource}`, { fetchAll: true })

  if (typeof resources === 'string') resources = JSON.parse(resources)
  return resources.map((a: any) => a[sortParam]).sort()
}

export const SiteCompletion: flags.ICompletion = {
  cacheDuration: day,
  options: async (ctx) => {
    let sites = await fetchFromNimbu('sites', ctx)
    return sites
  },
}

export const SiteSubdomainCompletion: flags.ICompletion = {
  skipCache: true,
  options: async (_) => {
    return ['a', 'b', 'c']

    // let sites = await fetchFromNimbu('sites', ctx, 'subdomain')
    // return sites
  },
}
