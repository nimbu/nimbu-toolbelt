import lolcatjs from 'lolcatjs'

const NIMBU_ASCII_ART = `
+====================================================================+
|  _   _ _           _           _____           _ _          _ _    |
| | \\ | (_)_ __ ___ | |__  _   _|_   _|__   ___ | | |__   ___| | |_  |
| |  \\| | | '_ \` _ \\| '_ \\| | | | | |/ _ \\ / _ \\| | '_ \\ / _ \\ | __| |
| | |\\  | | | | | | | |_) | |_| |_| | (_) | (_) | | |_) |  __/ | |_  |
| |_| \\_|_|_| |_| |_|_.__/ \\__,_(_)_|\\___/ \\___/|_|_.__/ \\___|_|\\__| |
|                                                                    |
+====================================================================+
`

export function displayNimbuHeader(): void {
  const options = {
    freq: 0.3,
    seed: Math.floor(Math.random() * 1000),
    speed: 100,
    spread: 8,
  }

  lolcatjs.fromString(NIMBU_ASCII_ART.trim(), options)

  // print a new line
  console.log('')
}

export function getNimbuHeader(): string {
  return NIMBU_ASCII_ART.trim()
}
