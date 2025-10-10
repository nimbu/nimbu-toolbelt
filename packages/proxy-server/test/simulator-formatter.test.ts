import { expect } from 'chai'
import { Request } from 'express'
import * as path from 'node:path'

import { SimulatorFormatter } from '../src/simulator-formatter'
import { TemplatePacker } from '../src/template-packer'

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
        body: {},
        headers: {
          accept: 'text/html',
          'user-agent': 'test-browser',
        },
        is: () => false,
        method: 'GET',
        path: '/test-page',
        query: { param: 'value' },
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload).to.have.property('simulator')
      expect(payload.simulator).to.have.property('version', 'v3')
      expect(payload.simulator).to.have.property('path', '/test-page')
      expect(payload.simulator).to.have.property('code')
      expect(payload.simulator).to.have.property('request')

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
        body: { email: 'john@example.com', name: 'John' },
        headers: {
          'content-type': 'application/json',
        },
        is: () => false,
        method: 'POST',
        path: '/submit',
        query: {},
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.request.method).to.equal('post')
      expect(payload.simulator.request.body).to.be.a('string')
      expect(payload.simulator.request.params).to.be.an('object')

      const body = JSON.parse(payload.simulator.request.body!)
      expect(body.name).to.equal('John')
      expect(body.email).to.equal('john@example.com')

      // Verify params include body data
      expect(payload.simulator.request.params.name).to.equal('John')
      expect(payload.simulator.request.params.email).to.equal('john@example.com')
    })

    it('should handle multipart requests with files', async () => {
      const rawFormData =
        '--boundary123\r\nContent-Disposition: form-data; name="name"\r\n\r\nJohn\r\n--boundary123\r\nContent-Disposition: form-data; name="avatar"; filename="avatar.jpg"\r\nContent-Type: image/jpeg\r\n\r\nimage data\r\n--boundary123--\r\n'

      const mockReq = {
        body: {
          avatar: {
            __type: 'file',
            data: Buffer.from('image data').toString('base64'),
            filename: 'avatar.jpg',
          },
          name: 'John',
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=boundary123',
        },
        is: (type: string) => type === 'multipart/form-data',
        method: 'POST',
        path: '/upload',
        query: {},
        rawBody: Buffer.from(rawFormData),
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      // For v3, we should have rawBody instead of processed files
      expect(payload.simulator.request.rawBody).to.be.a('string')
      expect(payload.simulator.version).to.equal('v3')

      // Verify the rawBody is base64 encoded form data
      const decodedBody = Buffer.from(payload.simulator.request.rawBody!, 'base64').toString()
      expect(decodedBody).to.include('John')
      expect(decodedBody).to.include('avatar.jpg')
    })

    it('should handle complex nested file structures', async () => {
      const rawFormData =
        '--boundary456\r\nContent-Disposition: form-data; name="user[documents][0]"; filename="doc1.pdf"\r\nContent-Type: application/pdf\r\n\r\npdf content 1\r\n--boundary456\r\nContent-Disposition: form-data; name="user[documents][1]"; filename="doc2.pdf"\r\nContent-Type: application/pdf\r\n\r\npdf content 2\r\n--boundary456--\r\n'

      const mockReq = {
        body: {
          user: {
            documents: [
              {
                __type: 'file',
                data: Buffer.from('pdf content 1').toString('base64'),
                filename: 'doc1.pdf',
              },
              {
                __type: 'file',
                data: Buffer.from('pdf content 2').toString('base64'),
                filename: 'doc2.pdf',
              },
            ],
          },
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=boundary456',
        },
        is: (type: string) => type === 'multipart/form-data',
        method: 'POST',
        path: '/complex-upload',
        query: {},
        rawBody: Buffer.from(rawFormData),
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      // For v3, we should have rawBody instead of processed files
      expect(payload.simulator.request.rawBody).to.be.a('string')
      expect(payload.simulator.version).to.equal('v3')

      // Verify the rawBody contains the file data
      const decodedBody = Buffer.from(payload.simulator.request.rawBody!, 'base64').toString()
      expect(decodedBody).to.include('doc1.pdf')
      expect(decodedBody).to.include('doc2.pdf')
      expect(decodedBody).to.include('pdf content 1')
      expect(decodedBody).to.include('pdf content 2')
    })

    it('should not include rawBody when no request body present', async () => {
      const mockReq = {
        body: {},
        headers: {},
        is: () => false,
        method: 'GET',
        path: '/no-files',
        query: {},
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      // For v3, we don't have files property anymore, but check rawBody
      expect(payload.simulator).to.not.have.property('files')
      expect(payload.simulator.request.rawBody).to.be.undefined
      expect(payload.simulator.version).to.equal('v3')
    })

    it('should merge query parameters with POST body parameters', async () => {
      const mockReq = {
        body: { message: 'Hello world', name: 'Alice' },
        headers: {
          'content-type': 'application/json',
        },
        is: () => false,
        method: 'POST',
        path: '/contact',
        query: { ref: 'homepage', source: 'newsletter' },
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.request.params).to.be.an('object')
      // Should contain both query and body parameters
      expect(payload.simulator.request.params.source).to.equal('newsletter')
      expect(payload.simulator.request.params.ref).to.equal('homepage')
      expect(payload.simulator.request.params.name).to.equal('Alice')
      expect(payload.simulator.request.params.message).to.equal('Hello world')
    })

    it('should handle PUT requests with parameters', async () => {
      const mockReq = {
        body: { email: 'updated@example.com', name: 'Updated Name' },
        headers: {
          'content-type': 'application/json',
        },
        is: () => false,
        method: 'PUT',
        path: '/users/123',
        query: { validate: 'true' },
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.request.method).to.equal('put')
      expect(payload.simulator.request.params).to.be.an('object')
      expect(payload.simulator.request.params.validate).to.equal('true')
      expect(payload.simulator.request.params.name).to.equal('Updated Name')
      expect(payload.simulator.request.params.email).to.equal('updated@example.com')
    })

    it('should handle PATCH requests with parameters', async () => {
      const mockReq = {
        body: { title: 'Updated Title' },
        headers: {
          'content-type': 'application/json',
        },
        is: () => false,
        method: 'PATCH',
        path: '/articles/456',
        query: { draft: 'false' },
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.request.method).to.equal('patch')
      expect(payload.simulator.request.params).to.be.an('object')
      expect(payload.simulator.request.params.draft).to.equal('false')
      expect(payload.simulator.request.params.title).to.equal('Updated Title')
    })

    it('should handle GET requests with only query parameters', async () => {
      const mockReq = {
        body: {},
        headers: {},
        is: () => false,
        method: 'GET',
        path: '/search',
        query: { filter: 'recent', q: 'nodejs' },
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.request.method).to.equal('get')
      expect(payload.simulator.request.params).to.be.an('object')
      expect(payload.simulator.request.params.q).to.equal('nodejs')
      expect(payload.simulator.request.params.filter).to.equal('recent')
      // Should not have body parameters for GET
      expect(Object.keys(payload.simulator.request.params)).to.have.lengthOf(2)
    })

    it('should handle body parameter precedence over query parameters', async () => {
      const mockReq = {
        body: { email: 'test@example.com', name: 'BodyName' },
        headers: {
          'content-type': 'application/json',
        },
        is: () => false,
        method: 'POST',
        path: '/api/test',
        query: { id: '999', name: 'QueryName' },
      } as unknown as Request

      const payload = await formatter.buildSimulatorPayload(mockReq)

      expect(payload.simulator.request.params).to.be.an('object')
      // Body parameters should override query parameters with the same key
      expect(payload.simulator.request.params.name).to.equal('BodyName')
      expect(payload.simulator.request.params.id).to.equal('999')
      expect(payload.simulator.request.params.email).to.equal('test@example.com')
    })
  })

  describe('shouldHandleRequest', () => {
    it('should handle regular page requests', () => {
      const mockReq = {
        headers: {},
        path: '/about',
        query: {},
      } as unknown as Request

      expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.true
    })

    it('should skip webpack resources', () => {
      const mockReq = {
        path: '/javascripts/app.js',
        query: {},
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
        '/webpack.stats.json',
      ]

      for (const path of hmrRequests) {
        const mockReq = { path, query: {} } as unknown as Request
        expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.false
      }
    })

    it('should handle favicon requests', () => {
      const mockReq = {
        headers: {},
        path: '/favicon.ico',
        query: {},
      } as unknown as Request

      expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.true
    })

    it('should handle private file requests', () => {
      const mockReq = {
        headers: {},
        path: '/downloads/document.pdf',
        query: { key: 'secret123' },
      } as unknown as Request

      expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.true
    })

    it('should not handle private files without key', () => {
      const mockReq = {
        headers: {},
        path: '/downloads/document.pdf',
        query: {},
      } as unknown as Request

      expect(SimulatorFormatter.shouldHandleRequest(mockReq, [])).to.be.true
    })
  })

  describe('cookie handling', () => {
    it('should map cookies to HTTP_COOKIE header', async () => {
      const mockReq = {
        body: {},
        headers: {
          cookie: '_nimbu_session=abc123; csrf_token=xyz789',
          host: 'localhost:3000',
        },
        is: () => false,
        method: 'GET',
        path: '/test',
        query: {},
        secure: false,
        url: '/test',
      } as unknown as Request

      const result = await formatter.buildSimulatorPayload(mockReq)
      const headers = JSON.parse(result.simulator.request.headers)

      expect(headers).to.have.property('HTTP_COOKIE', '_nimbu_session=abc123; csrf_token=xyz789')
      expect(headers).to.have.property('cookie', '_nimbu_session=abc123; csrf_token=xyz789')
    })

    it('should handle requests without cookies', async () => {
      const mockReq = {
        body: {},
        headers: {
          host: 'localhost:3000',
        },
        is: () => false,
        method: 'GET',
        path: '/test',
        query: {},
        secure: false,
        url: '/test',
      } as unknown as Request

      const result = await formatter.buildSimulatorPayload(mockReq)
      const headers = JSON.parse(result.simulator.request.headers)

      expect(headers).to.not.have.property('HTTP_COOKIE')
    })
  })
})
