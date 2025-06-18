import { expect } from 'chai'
import { Request } from 'express'
import { SimulatorFormatter } from '../src/simulator-formatter'
import { TemplatePacker } from '../src/template-packer'
import * as path from 'path'

describe('SimulatorFormatter', () => {
  let formatter: SimulatorFormatter
  let templatePacker: TemplatePacker

  beforeEach(() => {
    const testRoot = path.join(__dirname, 'fixtures')
    templatePacker = new TemplatePacker(testRoot)
    formatter = new SimulatorFormatter(templatePacker)
  })

  describe('buildSimulatorPayload', () => {
    it('should build basic simulator payload', async () => {
      const mockReq = {
        method: 'GET',
        path: '/test-page',
        headers: {
          'user-agent': 'test-browser',
          'accept': 'text/html'
        },
        query: { param: 'value' },
        body: {},
        is: () => false
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload).to.have.property('simulator')
      expect(payload.simulator).to.have.property('version')
      expect(payload.simulator).to.have.property('path', '/test-page')
      expect(payload.simulator).to.have.property('code')
      expect(payload.simulator).to.have.property('request')
      expect(payload.simulator).to.have.property('session')

      expect(payload.simulator.request.method).to.equal('get')
      expect(payload.simulator.request.headers).to.be.a('string')
      expect(payload.simulator.request.query).to.be.a('string')

      // Parse headers to verify content
      const headers = JSON.parse(payload.simulator.request.headers)
      expect(headers['user-agent']).to.equal('test-browser')
      expect(headers['x-nimbu-simulator']).to.include('nimbu-toolbelt-node')

      // Parse query to verify content
      const query = JSON.parse(payload.simulator.request.query)
      expect(query.param).to.equal('value')
    })

    it('should handle POST requests with body', async () => {
      const mockReq = {
        method: 'POST',
        path: '/submit',
        headers: {
          'content-type': 'application/json'
        },
        query: {},
        body: { name: 'John', email: 'john@example.com' },
        is: () => false
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.request.method).to.equal('post')
      expect(payload.simulator.request.body).to.be.a('string')

      const body = JSON.parse(payload.simulator.request.body!)
      expect(body.name).to.equal('John')
      expect(body.email).to.equal('john@example.com')
    })

    it('should handle multipart requests with files', async () => {
      const mockReq = {
        method: 'POST',
        path: '/upload',
        headers: {
          'content-type': 'multipart/form-data'
        },
        query: {},
        body: {
          name: 'John',
          avatar: {
            __type: 'file',
            filename: 'avatar.jpg',
            data: Buffer.from('image data').toString('base64')
          }
        },
        is: (type: string) => type === 'multipart/form-data'
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.files).to.be.an('object')
      expect(payload.simulator.files!.avatar).to.equal(Buffer.from('image data').toString('base64'))
    })

    it('should handle complex nested file structures', async () => {
      const mockReq = {
        method: 'POST',
        path: '/complex-upload',
        headers: {},
        query: {},
        body: {
          user: {
            documents: [
              {
                __type: 'file',
                filename: 'doc1.pdf',
                data: Buffer.from('pdf content 1').toString('base64')
              },
              {
                __type: 'file',
                filename: 'doc2.pdf',
                data: Buffer.from('pdf content 2').toString('base64')
              }
            ]
          }
        },
        is: (type: string) => type === 'multipart/form-data'
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.files).to.be.an('object')
      expect(payload.simulator.files!['user[documents][0]']).to.equal(Buffer.from('pdf content 1').toString('base64'))
      expect(payload.simulator.files!['user[documents][1]']).to.equal(Buffer.from('pdf content 2').toString('base64'))
    })

    it('should not include files property when no files present', async () => {
      const mockReq = {
        method: 'GET',
        path: '/no-files',
        headers: {},
        query: {},
        body: {},
        is: () => false
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator).to.not.have.property('files')
    })
  })

  describe('shouldHandleRequest', () => {
    it('should handle regular page requests', () => {
      const mockReq = {
        path: '/about',
        query: {}
      } as unknown as Request

      expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.true
    })

    it('should skip webpack resources', () => {
      const mockReq = {
        path: '/javascripts/app.js',
        query: {}
      } as unknown as Request

      const webpackResources = ['app.js', 'vendor.js']
      expect(SimulatorFormatter.shouldHandleRequest(mockReq, webpackResources)).to.be.false
    })

    it('should skip HMR and webpack dev server requests', () => {
      const hmrRequests = [
        '/app.d98feefa3ad3f14c2168.hot-update.json',
        '/app.d98feefa3ad3f14c2168.hot-update.js',
        '/__webpack_hmr',
        '/sockjs-node/info',
        '/webpack.stats.json'
      ]

      hmrRequests.forEach(path => {
        const mockReq = { path, query: {} } as unknown as Request
        expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.false
      })
    })

    it('should handle favicon requests', () => {
      const mockReq = {
        path: '/favicon.ico',
        query: {}
      } as unknown as Request

      expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.true
    })

    it('should handle private file requests', () => {
      const mockReq = {
        path: '/downloads/document.pdf',
        query: { key: 'secret123' }
      } as unknown as Request

      expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.true
    })

    it('should not handle private files without key', () => {
      const mockReq = {
        path: '/downloads/document.pdf',
        query: {}
      } as unknown as Request

      expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.true
    })
  })
})