/* eslint-disable unicorn/prefer-export-from */
import { HTTPError } from 'nimbu-client'

import Command from './command'
import * as buildConfig from './config/config'
import * as paths from './config/paths'
import * as flags from './flags'
import * as completions from './flags/completions'
import APIClient, { APIError, IOptions, IValidationError, isValidationError } from './nimbu/client'
import * as APITypes from './nimbu/types'

export type APIOptions = IOptions

export { color } from './nimbu/color'
export { AppConfig, Config } from './nimbu/config'
export {
  APIClient,
  APIError,
  APITypes,
  Command,
  HTTPError,
  IValidationError,
  buildConfig,
  completions,
  flags,
  isValidationError,
  paths,
}
export default Command
