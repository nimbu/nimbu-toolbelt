import { expect } from 'chai'
import nock from 'nock'

import { ProxyServer } from '../src/server'
import { SimulatorRequestData } from '../src/simulator-formatter'

describe('Nimbu Client Integration', () => {
  let server: ProxyServer
  let mockNimbuClient: any
  const mockApiUrl = 'https://api.nimbu.io'
  const port = 3002

  beforeEach(() => {
    mockNimbuClient = {
      getAuthContext: () => ({
        apiHost: 'api.nimbu.io',
        apiUrl: mockApiUrl,
        site: 'test-site',
        token: 'test-token',
      }),
      async simulatorRender(_payload: SimulatorRequestData) {
        // Return mock response directly instead of making real HTTP call
        return {
          body: Buffer.from('<html><body>Nimbu Response</body></html>', 'utf8').toString('base64'),
          headers: { 'content-type': 'text/html' },
          status: 200,
        }
      },
    }

    server = new ProxyServer({ nimbuClient: mockNimbuClient, port })
  })

  afterEach(async () => {
    if (server.running) {
      await server.stop()
    }

    nock.cleanAll()
  })

  it('should use nimbuClient for simulator requests', async () => {
    await server.start()

    const response = await makeHttpRequest(port, '/test-page')

    expect(response.statusCode).to.equal(200)
    expect(response.body).to.contain('Nimbu Response')
  })

  it('should handle authentication errors from nimbuClient', async () => {
    // Create a mock client with no authentication
    const unauthenticatedClient = {
      getAuthContext: () => ({
        apiHost: 'api.nimbu.io',
        apiUrl: mockApiUrl,
        site: null,
        token: null,
      }),
      async simulatorRender() {
        throw new Error('Authentication required')
      },
    }

    const unauthServer = new ProxyServer({
      nimbuClient: unauthenticatedClient,
      port: port + 1,
    })

    await unauthServer.start()

    try {
      const response = await makeHttpRequest(port + 1, '/test')
      expect(response.statusCode).to.equal(401)

      const data = JSON.parse(response.body)
      expect(data.error).to.equal('Authentication Required')
      expect(data.message).to.contain('nimbu auth:login')
    } finally {
      await unauthServer.stop()
    }
  })

  it('should handle missing site configuration', async () => {
    // Create a mock client with token but no site
    const noSiteClient = {
      getAuthContext: () => ({
        apiHost: 'api.nimbu.io',
        apiUrl: mockApiUrl,
        site: null,
        token: 'test-token',
      }),
      async simulatorRender() {
        // This shouldn't be called due to site check
        throw new Error('Should not reach simulator call')
      },
    }

    const noSiteServer = new ProxyServer({
      nimbuClient: noSiteClient,
      port: port + 2,
    })

    await noSiteServer.start()

    try {
      const response = await makeHttpRequest(port + 2, '/test')
      expect(response.statusCode).to.equal(500)

      const data = JSON.parse(response.body)
      expect(data.message).to.contain('Site configuration missing')
      expect(data.message).to.contain('nimbu sites:use')
    } finally {
      await noSiteServer.stop()
    }
  })

  it('should include authentication context in health check', async () => {
    await server.start()

    const response = await makeHttpRequest(port, '/health')
    expect(response.statusCode).to.equal(200)

    const data = JSON.parse(response.body)
    expect(data.nimbu).to.deep.include({
      apiHost: 'api.nimbu.io',
      authenticated: true,
      site: 'test-site',
    })
    expect(data.status).to.equal('ok')
  })
})

function makeHttpRequest(
  port: number,
  path: string,
  method = 'GET',
  body?: any,
): Promise<{
  body: string
  headers: any
  statusCode: number
}> {
  return new Promise((resolve, reject) => {
    const http = require('node:http')
    const zlib = require('node:zlib')
    const postData = body ? JSON.stringify(body) : undefined

    const options = {
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
      },
      hostname: 'localhost',
      method,
      path,
      port,
    }

    const req = http.request(options, (res: any) => {
      let responseBody = ''

      // Handle gzip compression
      if (res.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip()
        res.pipe(gunzip)

        gunzip.on('data', (chunk: any) => {
          responseBody += chunk
        })

        gunzip.on('end', () => {
          resolve({
            body: responseBody,
            headers: res.headers,
            statusCode: res.statusCode || 0,
          })
        })
      } else {
        res.on('data', (chunk: any) => {
          responseBody += chunk
        })

        res.on('end', () => {
          resolve({
            body: responseBody,
            headers: res.headers,
            statusCode: res.statusCode || 0,
          })
        })
      }
    })

    req.on('error', reject)

    if (postData) {
      req.write(postData)
    }

    req.end()
  })
}
