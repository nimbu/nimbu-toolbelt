const path = require('node:path')

process.env.NODE_ENV = 'test'
process.env.TS_NODE_PROJECT = path.resolve('test/tsconfig.json')
