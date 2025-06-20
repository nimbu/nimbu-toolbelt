import { expect } from 'chai'
import { Request } from 'express'
import { RequestExtractor } from '../src/request-extractor'

describe('RequestExtractor', () => {
  
  describe('extractMetadata', () => {
    it('should extract basic request metadata', () => {
      const mockReq = {
        method: 'GET',
        path: '/test',
        headers: {
          'user-agent': 'test-browser',
          'content-type': 'application/json'
        },
        query: { param1: 'value1' },
        body: {}
      } as unknown as Request

      const metadata = RequestExtractor.extractMetadata(mockReq)

      expect(metadata.method).to.equal('get')
      expect(metadata.path).to.equal('/test')
      expect(metadata.headers['user-agent']).to.equal('test-browser')
      expect(metadata.headers['x-nimbu-simulator']).to.include('nimbu-toolbelt-node')
      expect(metadata.query.param1).to.equal('value1')
    })

    it('should handle root path correctly', () => {
      const mockReq = {
        method: 'GET',
        path: '/',
        headers: {},
        query: {},
        body: {}
      } as unknown as Request

      const metadata = RequestExtractor.extractMetadata(mockReq)
      expect(metadata.path).to.equal('/')
    })

    it('should remove trailing slash from non-root paths', () => {
      const mockReq = {
        method: 'POST',
        path: '/some/path/',
        headers: {},
        query: {},
        body: { data: 'test' }
      } as unknown as Request

      const metadata = RequestExtractor.extractMetadata(mockReq)
      expect(metadata.path).to.equal('/some/path')
      expect(metadata.method).to.equal('post')
      expect(metadata.body.data).to.equal('test')
    })

    it('should set Rack-specific headers for Ruby server compatibility', () => {
      const mockReq = {
        method: 'POST',
        path: '/api/users',
        url: '/api/users?id=123&name=test',
        headers: {
          'content-type': 'application/json'
        },
        query: { id: '123', name: 'test' },
        body: { email: 'test@example.com' }
      } as unknown as Request

      const metadata = RequestExtractor.extractMetadata(mockReq)
      const headers = JSON.parse(JSON.stringify(metadata.headers))

      expect(headers.REQUEST_METHOD).to.equal('POST')
      expect(headers.REQUEST_PATH).to.equal('/api/users')
      expect(headers.PATH_INFO).to.equal('/api/users')
      expect(headers.REQUEST_URI).to.equal('/api/users?id=123&name=test')
      expect(headers.QUERY_STRING).to.equal('id=123&name=test')
      expect(headers['x-nimbu-simulator']).to.include('nimbu-toolbelt-node')
    })

    it('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
      
      for (const method of methods) {
        const mockReq = {
          method,
          path: '/test',
          headers: {},
          query: {},
          body: {}
        } as unknown as Request

        const metadata = RequestExtractor.extractMetadata(mockReq)
        expect(metadata.method).to.equal(method.toLowerCase())
      }
    })
  })

  describe('isWebpackResource', () => {
    it('should identify webpack resources correctly', () => {
      const webpackResources = ['app.js', 'vendor.js']
      
      expect(RequestExtractor.isWebpackResource('/javascripts/app.js', webpackResources)).to.be.true
      expect(RequestExtractor.isWebpackResource('/javascripts/vendor.js', webpackResources)).to.be.true
      expect(RequestExtractor.isWebpackResource('/javascripts/other.js', webpackResources)).to.be.false
      expect(RequestExtractor.isWebpackResource('/css/app.css', webpackResources)).to.be.false
    })

    it('should return false when no webpack resources configured', () => {
      expect(RequestExtractor.isWebpackResource('/javascripts/app.js', [])).to.be.false
      expect(RequestExtractor.isWebpackResource('/javascripts/app.js', undefined)).to.be.false
    })

    it('should identify HMR (Hot Module Replacement) requests', () => {
      expect(RequestExtractor.isWebpackResource('/app.d98feefa3ad3f14c2168.hot-update.json')).to.be.true
      expect(RequestExtractor.isWebpackResource('/app.d98feefa3ad3f14c2168.hot-update.js')).to.be.true
      expect(RequestExtractor.isWebpackResource('/vendor.abc123def456.hot-update.json')).to.be.true
      expect(RequestExtractor.isWebpackResource('/main.12345.hot-update.js')).to.be.true
    })

    it('should identify webpack dev server websocket connections', () => {
      expect(RequestExtractor.isWebpackResource('/__webpack_hmr')).to.be.true
      expect(RequestExtractor.isWebpackResource('/sockjs-node/info')).to.be.true
      expect(RequestExtractor.isWebpackResource('/sockjs-node/123/456/websocket')).to.be.true
    })

    it('should identify webpack manifest and stats files', () => {
      expect(RequestExtractor.isWebpackResource('/webpack.stats.json')).to.be.true
      expect(RequestExtractor.isWebpackResource('/webpack-manifest.json')).to.be.true
      expect(RequestExtractor.isWebpackResource('/assets/webpack-bundle.js')).to.be.true
    })

    it('should not identify non-webpack paths as webpack resources', () => {
      expect(RequestExtractor.isWebpackResource('/pages/home')).to.be.false
      expect(RequestExtractor.isWebpackResource('/api/users')).to.be.false
      expect(RequestExtractor.isWebpackResource('/favicon.ico')).to.be.false
      expect(RequestExtractor.isWebpackResource('/images/logo.png')).to.be.false
      expect(RequestExtractor.isWebpackResource('/styles/main.css')).to.be.false
    })
  })

  describe('isPrivateFile', () => {
    it('should identify private files correctly', () => {
      const mockReq1 = {
        path: '/downloads/file.pdf',
        query: { key: 'secret123' }
      } as unknown as Request

      const mockReq2 = {
        path: '/downloads/file.pdf',
        query: {}
      } as unknown as Request

      const mockReq3 = {
        path: '/public/file.pdf',
        query: { key: 'secret123' }
      } as unknown as Request

      expect(RequestExtractor.isPrivateFile(mockReq1)).to.be.true
      expect(RequestExtractor.isPrivateFile(mockReq2)).to.be.false
      expect(RequestExtractor.isPrivateFile(mockReq3)).to.be.false
    })
  })

  describe('isFavicon', () => {
    it('should identify favicon requests', () => {
      expect(RequestExtractor.isFavicon('/favicon.ico')).to.be.true
      expect(RequestExtractor.isFavicon('/favicon.ico?v=1')).to.be.true
      expect(RequestExtractor.isFavicon('/images/favicon.ico')).to.be.false
      expect(RequestExtractor.isFavicon('/test')).to.be.false
    })
  })
})