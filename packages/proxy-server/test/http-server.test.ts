import { expect } from 'chai'
import * as http from 'http'
import * as zlib from 'zlib'
import { ProxyServer } from '../src/server'

// Mock nimbuClient for testing
const createMockNimbuClient = () => ({
  getAuthContext: () => ({
    apiHost: 'api.nimbu.io',
    apiUrl: 'https://api.nimbu.io',
    site: 'test-site',
    token: 'test-token'
  }),
  simulatorRender: async (payload: any) => ({
    status: 200,
    body: Buffer.from('<html><body>Test Response</body></html>', 'utf8').toString('base64'),
    headers: { 'content-type': 'text/html' }
  })
})

describe('HTTP Server Functionality', () => {
  let server: ProxyServer
  let mockNimbuClient: any
  const port = 3001

  beforeEach(() => {
    mockNimbuClient = createMockNimbuClient()
    server = new ProxyServer({ port, nimbuClient: mockNimbuClient })
  })

  afterEach(async () => {
    if (server.running) {
      await server.stop()
    }
  })

  it('should start server and respond to requests', async () => {
    await server.start()
    
    const response = await makeRequest(port, '/health')
    expect(response.statusCode).to.equal(200)
    
    const data = JSON.parse(response.body)
    expect(data.status).to.equal('ok')
    expect(data.timestamp).to.be.a('string')
  })

  it('should handle favicon requests through simulator', async () => {
    await server.start()
    
    const response = await makeRequest(port, '/favicon.ico')
    expect(response.statusCode).to.equal(200) // Now handled by simulator, not 404
    
    // Should contain the mock response from simulator
    expect(response.body).to.contain('Test Response')
  })

  it('should accept custom middleware', async () => {
    // Create a new server instance to test middleware
    const testMockClient = createMockNimbuClient()
    const testServer = new ProxyServer({ port: port + 1, nimbuClient: testMockClient })
    
    testServer.use((req, res, next) => {
      res.setHeader('X-Custom-Header', 'test-value')
      next()
    })

    await testServer.start()
    
    try {
      const response = await makeRequest(port + 1, '/health')
      expect(response.headers['x-custom-header']).to.equal('test-value')
    } finally {
      await testServer.stop()
    }
  })

  it('should handle POST requests', async () => {
    await server.start()
    
    const response = await makeRequest(port, '/test', 'POST', { test: 'data' })
    expect(response.statusCode).to.equal(200) // Should work with mock client
    
    expect(response.body).to.contain('Test Response')
  })

  it('should serve static files from images directory', async () => {
    // Create a temporary test file structure
    const fs = require('fs')
    const path = require('path')
    
    const testDir = path.join(process.cwd(), 'test-temp')
    const imagesDir = path.join(testDir, 'images')
    
    // Clean up any existing test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true })
    }
    
    try {
      // Create test structure
      fs.mkdirSync(testDir, { recursive: true })
      fs.mkdirSync(imagesDir, { recursive: true })
      
      // Create test SVG file
      const testSvgContent = '<svg><circle r="50" cx="50" cy="50" fill="white"/></svg>'
      fs.writeFileSync(path.join(imagesDir, 'logo_white.svg'), testSvgContent)
      
      // Create server with custom template path
      const staticServer = new ProxyServer({
        port: port + 1,
        nimbuClient: mockNimbuClient,
        templatePath: testDir
      })
      
      await staticServer.start()
      
      try {
        const response = await makeRequest(port + 1, '/images/logo_white.svg')
        
        expect(response.statusCode).to.equal(200)
        expect(response.body).to.equal(testSvgContent)
        expect(response.headers['content-type']).to.contain('image/svg+xml')
      } finally {
        await staticServer.stop()
      }
    } finally {
      // Clean up test directory
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true })
      }
    }
  })

  it('should return 404 for non-existent static files', async () => {
    await server.start()
    
    const response = await makeRequest(port, '/images/non-existent.png')
    expect(response.statusCode).to.equal(404)
  })
})

function makeRequest(port: number, path: string, method = 'GET', body?: any): Promise<{
  statusCode: number
  headers: http.IncomingHttpHeaders
  body: string
}> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : undefined
    
    const options: http.RequestOptions = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      }
    }

    const req = http.request(options, (res) => {
      let responseBody = ''
      
      // Handle gzip compression
      if (res.headers['content-encoding'] === 'gzip') {
        const gunzip = zlib.createGunzip()
        res.pipe(gunzip)
        
        gunzip.on('data', (chunk) => {
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
        res.on('data', (chunk) => {
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