import Command from './command'

import * as flags from './flags'
import * as completions from './flags/completions'
import * as paths from './config/paths'
import * as buildConfig from './config/config'
import * as APITypes from './nimbu/types'

import { HTTPError } from 'nimbu-client'
import APIClient, { APIError, IOptions, isValidationError, IValidationError } from './nimbu/client'

export type APIOptions = IOptions

export { Config, AppConfig } from './nimbu/config'
export { color } from './nimbu/color'
export {
  Command,
  APIClient,
  APIError,
  HTTPError,
  paths,
  flags,
  completions,
  APITypes,
  buildConfig,
  isValidationError,
  IValidationError,
}
export default Command
