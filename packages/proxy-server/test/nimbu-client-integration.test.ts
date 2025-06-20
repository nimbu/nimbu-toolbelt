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
        token: 'test-token'
      }),
      simulatorRender: async (payload: SimulatorRequestData) => {
        // Return mock response directly instead of making real HTTP call
        return {
          status: 200,
          body: Buffer.from('<html><body>Nimbu Response</body></html>', 'utf8').toString('base64'),
          headers: { 'content-type': 'text/html' }
        }
      }
    }
    
    server = new ProxyServer({ port, nimbuClient: mockNimbuClient })
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
        token: null
      }),
      simulatorRender: async () => {
        throw new Error('Authentication required')
      }
    }
    
    const unauthServer = new ProxyServer({ 
      port: port + 1, 
      nimbuClient: unauthenticatedClient 
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
        token: 'test-token'
      }),
      simulatorRender: async () => {
        // This shouldn't be called due to site check
        throw new Error('Should not reach simulator call')
      }
    }
    
    const noSiteServer = new ProxyServer({ 
      port: port + 2, 
      nimbuClient: noSiteClient 
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
      site: 'test-site'
    })
    expect(data.status).to.equal('ok')
  })
})

function makeHttpRequest(port: number, path: string, method = 'GET', body?: any): Promise<{
  statusCode: number
  headers: any
  body: string
}> {
  return new Promise((resolve, reject) => {
    const http = require('http')
    const zlib = require('zlib')
    const postData = body ? JSON.stringify(body) : undefined
    
    const options = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      }
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
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: responseBody
          })
        })
      } else {
        res.on('data', (chunk: any) => {
          responseBody += chunk
        })
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: responseBody
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