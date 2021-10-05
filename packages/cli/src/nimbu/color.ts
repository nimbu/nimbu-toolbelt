import chalk from 'chalk'
import supports from 'supports-color'

const dim = process.env.ConEmuANSI === 'ON' ? chalk.gray : chalk.dim

const Colors: {
  supports: typeof supports
  grey(s: string): string
  dim(s: string): string
  cmd(s: string): string
} = {
  supports,
  grey: dim,
  dim,
  cmd: chalk.cyan.bold,
}

export const color: typeof Colors & typeof chalk = new Proxy(chalk, {
  get: (chalk, name) => {
    if ((Colors as any)[name]) return (Colors as any)[name]
    return (chalk as any)[name]
  },
  set: (chalk, name, value) => {
    switch (name) {
      case 'enabled':
        chalk.enabled = value
        break
      default:
        throw new Error(`cannot set property ${name.toString()}`)
    }
    return true
  },
}) as typeof Colors & typeof chalk

export default color
