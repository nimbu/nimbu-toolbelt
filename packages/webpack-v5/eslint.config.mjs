import rootConfig from '../../eslint.config.mjs'

export default [
  ...rootConfig,
  {
    rules: {
      'n/no-missing-require': 'off',
    },
  },
]
