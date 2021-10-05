import spawn from './process'

export default function (site: string, token: string, command: string, args: Array<string> = []): Promise<void> {
  return new Promise<void>((_resolve, _reject) => {
    spawn(site, token, command, args)
  })
}
