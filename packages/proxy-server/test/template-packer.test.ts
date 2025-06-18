import { expect } from 'chai'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { TemplatePacker } from '../src/template-packer'

describe('TemplatePacker', () => {
  let tempDir: string
  let packer: TemplatePacker

  beforeEach(() => {
    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nimbu-test-'))
    packer = new TemplatePacker(tempDir)
  })

  afterEach(() => {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('packTemplates', () => {
    it('should pack templates from all directories', async () => {
      // Create test template files
      const layoutsDir = path.join(tempDir, 'layouts')
      const templatesDir = path.join(tempDir, 'templates')
      const snippetsDir = path.join(tempDir, 'snippets')

      fs.mkdirSync(layoutsDir, { recursive: true })
      fs.mkdirSync(templatesDir, { recursive: true })
      fs.mkdirSync(snippetsDir, { recursive: true })

      fs.writeFileSync(path.join(layoutsDir, 'application.liquid'), '<html>{{ content_for_layout }}</html>')
      fs.writeFileSync(path.join(templatesDir, 'index.liquid'), '<h1>Welcome</h1>')
      fs.writeFileSync(path.join(snippetsDir, 'header.liquid'), '<header>Site Header</header>')

      const templates = await packer.packTemplates()

      expect(templates).to.have.property('layouts')
      expect(templates).to.have.property('templates')
      expect(templates).to.have.property('snippets')

      expect(templates.layouts['application.liquid']).to.equal('<html>{{ content_for_layout }}</html>')
      expect(templates.templates['index.liquid']).to.equal('<h1>Welcome</h1>')
      expect(templates.snippets['header.liquid']).to.equal('<header>Site Header</header>')
    })

    it('should handle nested directories', async () => {
      const templatesDir = path.join(tempDir, 'templates')
      const nestedDir = path.join(templatesDir, 'products')
      
      fs.mkdirSync(nestedDir, { recursive: true })
      fs.writeFileSync(path.join(nestedDir, 'show.liquid'), '<div>Product {{ product.name }}</div>')

      const templates = await packer.packTemplates()

      expect(templates.templates).to.have.property('products/show.liquid')
      expect(templates.templates['products/show.liquid']).to.equal('<div>Product {{ product.name }}</div>')
    })

    it('should handle .liquid.haml files', async () => {
      const templatesDir = path.join(tempDir, 'templates')
      fs.mkdirSync(templatesDir, { recursive: true })
      
      fs.writeFileSync(path.join(templatesDir, 'page.liquid.haml'), '%h1= page.title')

      const templates = await packer.packTemplates()

      expect(templates.templates['page.liquid.haml']).to.equal('%h1= page.title')
    })

    it('should handle missing directories gracefully', async () => {
      const templates = await packer.packTemplates()

      expect(templates).to.have.property('layouts')
      expect(templates).to.have.property('templates')
      expect(templates).to.have.property('snippets')

      expect(Object.keys(templates.layouts)).to.have.length(0)
      expect(Object.keys(templates.templates)).to.have.length(0)
      expect(Object.keys(templates.snippets)).to.have.length(0)
    })
  })

  describe('getCompressedTemplates', () => {
    it('should return base64 compressed template data', async () => {
      const layoutsDir = path.join(tempDir, 'layouts')
      fs.mkdirSync(layoutsDir, { recursive: true })
      fs.writeFileSync(path.join(layoutsDir, 'application.liquid'), '<html>test</html>')

      const compressed = await packer.getCompressedTemplates()

      expect(compressed).to.be.a('string')
      expect(compressed.length).to.be.greaterThan(0)
      
      // Should be valid base64
      expect(() => Buffer.from(compressed, 'base64')).to.not.throw()
    })
  })

  describe('hasTemplate', () => {
    it('should detect existing template files', () => {
      const layoutsDir = path.join(tempDir, 'layouts')
      fs.mkdirSync(layoutsDir, { recursive: true })
      fs.writeFileSync(path.join(layoutsDir, 'application.liquid'), '<html></html>')

      expect(packer.hasTemplate(tempDir, 'layouts', 'application.liquid')).to.be.true
      expect(packer.hasTemplate(tempDir, 'layouts', 'missing.liquid')).to.be.false
    })

    it('should detect files with and without extensions', () => {
      const templatesDir = path.join(tempDir, 'templates')
      fs.mkdirSync(templatesDir, { recursive: true })
      fs.writeFileSync(path.join(templatesDir, 'page.liquid'), '<div></div>')

      expect(packer.hasTemplate(tempDir, 'templates', 'page.liquid')).to.be.true
      expect(packer.hasTemplate(tempDir, 'templates', 'page')).to.be.true
    })
  })
})