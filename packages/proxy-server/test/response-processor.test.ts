import { expect } from 'chai'
import { Response } from 'express'
import { ISimulatorResponse } from '@nimbu-cli/command/lib/nimbu/client'
import { ResponseProcessor } from '../src/response-processor'

describe('ResponseProcessor', () => {
  let mockRes: any

  beforeEach(() => {
    mockRes = {
      status: function(code: number) {
        this.statusCode = code
        return this
      },
      set: function(name: string, value: string) {
        if (!this.headers) this.headers = {}
        this.headers[name] = value
        return this
      },
      send: function(body: any) {
        this.body = body
        return this
      },
      json: function(data: any) {
        this.jsonData = data
        return this
      },
      statusCode: 200,
      headers: {},
      body: null,
      jsonData: null
    }
  })

  describe('processResponse', () => {
    it('should process HTML response correctly', () => {
      const htmlContent = '<html><body>Hello World</body></html>'
      const base64Content = Buffer.from(htmlContent, 'utf8').toString('base64')
      
      const simulatorResponse: ISimulatorResponse = {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, max-age=3600'
        },
        body: base64Content
      }

      ResponseProcessor.processResponse(simulatorResponse, mockRes as Response)

      expect(mockRes.statusCode).to.equal(200)
      expect(mockRes.headers['content-type']).to.equal('text/html; charset=utf-8')
      expect(mockRes.headers['cache-control']).to.equal('public, max-age=3600')
      expect(mockRes.body).to.equal('<html><body>Hello World</body></html>')
    })

    it('should process binary response with base64 encoding', () => {
      const imageData = Buffer.from('fake image data', 'utf8').toString('base64')
      
      const simulatorResponse: ISimulatorResponse = {
        status: 200,
        headers: {
          'content-type': 'image/jpeg',
          'content-length': '12345'
        },
        body: imageData,
        encoding: 'base64'
      }

      ResponseProcessor.processResponse(simulatorResponse, mockRes as Response)

      expect(mockRes.statusCode).to.equal(200)
      expect(mockRes.headers['content-type']).to.equal('image/jpeg')
      expect(mockRes.body).to.be.instanceOf(Buffer)
      
      // Verify the buffer contains the correct decoded data
      const decodedData = (mockRes.body as Buffer).toString('utf8')
      expect(decodedData).to.equal('fake image data')
    })

    it('should handle error status codes', () => {
      const errorContent = '<html><body>Page not found</body></html>'
      const base64ErrorContent = Buffer.from(errorContent, 'utf8').toString('base64')
      
      const simulatorResponse: ISimulatorResponse = {
        status: 404,
        headers: {
          'content-type': 'text/html'
        },
        body: base64ErrorContent
      }

      ResponseProcessor.processResponse(simulatorResponse, mockRes as Response)

      expect(mockRes.statusCode).to.equal(404)
      expect(mockRes.body).to.equal('<html><body>Page not found</body></html>')
    })

    it('should filter out connection headers', () => {
      const simulatorResponse: ISimulatorResponse = {
        status: 200,
        headers: {
          'content-type': 'text/html',
          'connection': 'keep-alive',
          'transfer-encoding': 'chunked',
          'custom-header': 'should-be-included'
        },
        body: 'Hello World'
      }

      ResponseProcessor.processResponse(simulatorResponse, mockRes as Response)

      expect(mockRes.headers['content-type']).to.equal('text/html')
      expect(mockRes.headers['custom-header']).to.equal('should-be-included')
      expect(mockRes.headers['connection']).to.be.undefined
      expect(mockRes.headers['transfer-encoding']).to.be.undefined
    })
  })

  describe('handleError', () => {
    it('should handle simulator API errors', () => {
      const error = new Error('Simulator API error 500: Internal Server Error')
      
      ResponseProcessor.handleError(error, mockRes as Response)

      expect(mockRes.statusCode).to.equal(500)
      expect(mockRes.jsonData).to.deep.equal({
        error: 'Simulator API Error',
        message: 'Simulator API error 500: Internal Server Error'
      })
    })

    it('should handle connection errors', () => {
      const error = new Error('Failed to connect to Nimbu simulator API')
      
      ResponseProcessor.handleError(error, mockRes as Response)

      expect(mockRes.statusCode).to.equal(502)
      expect(mockRes.jsonData).to.deep.equal({
        error: 'Gateway Error',
        message: 'Failed to connect to Nimbu simulator API'
      })
    })

    it('should handle base64 validation errors', () => {
      const error = new Error('Invalid base64 content received from simulator')
      
      ResponseProcessor.handleError(error, mockRes as Response)

      expect(mockRes.statusCode).to.equal(502)
      expect(mockRes.jsonData).to.deep.equal({
        error: 'Response Processing Error',
        message: 'Invalid response format from simulator'
      })
    })

    it('should handle unknown errors', () => {
      const error = new Error('Unknown error occurred')
      
      ResponseProcessor.handleError(error, mockRes as Response)

      expect(mockRes.statusCode).to.equal(500)
      expect(mockRes.jsonData).to.deep.equal({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred'
      })
    })
  })

  describe('shouldCache', () => {
    it('should allow caching when cache-control is public', () => {
      const headers = { 'cache-control': 'public, max-age=3600' }
      expect(ResponseProcessor.shouldCache(headers)).to.be.true
    })

    it('should prevent caching when no-cache is set', () => {
      const headers = { 'cache-control': 'no-cache' }
      expect(ResponseProcessor.shouldCache(headers)).to.be.false
    })

    it('should prevent caching when no-store is set', () => {
      const headers = { 'cache-control': 'no-store' }
      expect(ResponseProcessor.shouldCache(headers)).to.be.false
    })

    it('should prevent caching when private is set', () => {
      const headers = { 'cache-control': 'private' }
      expect(ResponseProcessor.shouldCache(headers)).to.be.false
    })

    it('should allow caching when expires header is present', () => {
      const headers = { 'expires': 'Wed, 21 Oct 2025 07:28:00 GMT' }
      expect(ResponseProcessor.shouldCache(headers)).to.be.true
    })

    it('should allow caching when etag is present', () => {
      const headers = { 'etag': '"abc123"' }
      expect(ResponseProcessor.shouldCache(headers)).to.be.true
    })

    it('should not cache when no cache headers present', () => {
      const headers = { 'content-type': 'text/html' }
      expect(ResponseProcessor.shouldCache(headers)).to.be.false
    })
  })

  describe('getContentType', () => {
    it('should return content-type header when present', () => {
      const headers = { 'content-type': 'application/json' }
      expect(ResponseProcessor.getContentType(headers)).to.equal('application/json')
    })

    it('should handle case-insensitive header names', () => {
      const headers = { 'Content-Type': 'text/xml' }
      expect(ResponseProcessor.getContentType(headers)).to.equal('text/xml')
    })

    it('should return default content type when header missing', () => {
      const headers = {}
      expect(ResponseProcessor.getContentType(headers)).to.equal('text/html')
    })
  })

  describe('isBinaryContent', () => {
    it('should detect image content as binary', () => {
      expect(ResponseProcessor.isBinaryContent('image/jpeg')).to.be.true
      expect(ResponseProcessor.isBinaryContent('image/png')).to.be.true
    })

    it('should detect PDF content as binary', () => {
      expect(ResponseProcessor.isBinaryContent('application/pdf')).to.be.true
    })

    it('should detect font content as binary', () => {
      expect(ResponseProcessor.isBinaryContent('font/woff2')).to.be.true
    })

    it('should not detect text content as binary', () => {
      expect(ResponseProcessor.isBinaryContent('text/html')).to.be.false
      expect(ResponseProcessor.isBinaryContent('application/json')).to.be.false
    })
  })
})