import { expect } from 'chai'

import { ProxyServer } from '../src/server'

// Mock nimbuClient for testing
const createMockNimbuClient = () => ({
  getAuthContext: () => ({
    apiHost: 'api.nimbu.io',
    apiUrl: 'https://api.nimbu.io',
    site: 'test-site',
    token: 'test-token',
  }),
  simulatorRender: async (_payload: any) => ({
    body: Buffer.from('<html><body>Test Response</body></html>', 'utf8').toString('base64'),
    headers: { 'content-type': 'text/html' },
    status: 200,
  }),
})

describe('ProxyServer', () => {
  let server: ProxyServer
  let mockNimbuClient: any

  beforeEach(() => {
    mockNimbuClient = createMockNimbuClient()
    server = new ProxyServer({ nimbuClient: mockNimbuClient, port: 3000 })
  })

  afterEach(async () => {
    if (server.running) {
      await server.stop()
    }
  })

  it('should create a server instance', () => {
    expect(server).to.be.instanceOf(ProxyServer)
  })

  it('should start and stop server', async () => {
    expect(server.running).to.be.false

    await server.start()
    expect(server.running).to.be.true

    await server.stop()
    expect(server.running).to.be.false
  })

  it('should allow adding middleware', () => {
    const middleware = (req: any, res: any, next: () => void) => next()
    server.use(middleware)
    // Middleware is added (no direct way to test without server running)
  })
})
