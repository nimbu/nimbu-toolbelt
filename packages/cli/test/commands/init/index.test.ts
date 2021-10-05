import test, { expect } from '../../helpers/setup'

describe('init', () => {
  test
    .env({ NIMBU_API_KEY: 'foobar' }, { clear: true })
    .fs({
      '/nimbu/README.md': 'foo bar',
    })
    .stdout()
    .stderr()
    .command(['init', '--site=zenjoy', '--cloudcode', '--haml'])
    .it('sets up the directory for Nimbu theme development', ctx => {
      let output =
        '\nInitializing directories:\n' +
        '- cloudcode\n' +
        '- haml/layouts\n' +
        '- haml/snippets\n' +
        '- haml/templates\n' +
        '- images\n' +
        '- javascripts\n' +
        '- layouts\n' +
        '- snippets\n' +
        '- stylesheets\n' +
        '- templates\n' +
        '\nDone.\n'

      let expectedConfig = 'theme: default-theme\nsite: zenjoy'
      let fs = require('fs-extra')
      let contents = fs.readFileSync('nimbu.yml').toString()

      expect(ctx.stdout).to.equal(output)
      expect(contents).to.equal(expectedConfig)
    })
})
