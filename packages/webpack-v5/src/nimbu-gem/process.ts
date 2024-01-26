import { ChildProcess, StdioOptions, spawn } from 'node:child_process'
import * as path from 'node:path'

import * as paths from '../config/paths'

// eslint-disable-next-line max-params
export default function (
  site: string,
  token: string,
  command: string,
  args: Array<string> = [],
  stdio: StdioOptions = 'inherit',
  embeddedGemfile = true,
): ChildProcess {
  return spawn('bundle', ['exec', 'nimbu', command, ...args], {
    cwd: paths.NIMBU_DIRECTORY,
    env: {
      ...process.env,
      BUNDLE_GEMFILE: embeddedGemfile ? paths.GEMFILE : path.resolve(paths.NIMBU_DIRECTORY, 'Gemfile'),
      NIMBU_API_KEY: token,
      NIMBU_SITE: site,
    },
    shell: true,
    stdio,
  })
}
