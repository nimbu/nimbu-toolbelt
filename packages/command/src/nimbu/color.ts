import chalk from 'chalk'
import { supportsColor } from 'supports-color'

const dim = process.env.ConEmuANSI === 'ON' ? chalk.gray : chalk.dim

const Colors: {
  cmd(s: string): string
  dim(s: string): string
  grey(s: string): string
  supports: typeof supportsColor
} = {
  cmd: chalk.cyan.bold,
  dim,
  grey: dim,
  supports: supportsColor,
}

export const color: typeof Colors & typeof chalk = new Proxy(chalk, {
  get(chalk, name) {
    if ((Colors as any)[name]) return (Colors as any)[name]
    return (chalk as any)[name]
  },
  set(chalk, name, value) {
    switch (name) {
      case 'enabled': {
        chalk.Level = value
        break
      }

      default: {
        throw new Error(`cannot set property ${name.toString()}`)
      }
    }

    return true
  },
}) as typeof Colors & typeof chalk

export default color
