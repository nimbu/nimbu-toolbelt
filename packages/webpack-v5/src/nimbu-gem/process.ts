import { spawn, ChildProcess, StdioOptions } from 'child_process'
import * as path from 'path'
import * as paths from '../config/paths'

export default function (
  site: string,
  token: string,
  command: string,
  args: Array<string> = [],
  stdio: StdioOptions = 'inherit',
  embeddedGemfile = true,
): ChildProcess {
  return spawn('bundle', ['exec', 'nimbu', command].concat(args), {
    shell: true,
    stdio,
    cwd: paths.NIMBU_DIRECTORY,
    env: Object.assign({}, process.env, {
      NIMBU_API_KEY: token,
      BUNDLE_GEMFILE: embeddedGemfile ? paths.GEMFILE : path.resolve(paths.NIMBU_DIRECTORY, 'Gemfile'),
      NIMBU_SITE: site,
    }),
  })
}
