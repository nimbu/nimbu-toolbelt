import { expect } from 'chai'
import { FileProcessor } from '../src/file-processor'

describe('FileProcessor', () => {
  
  describe('processMultipartData', () => {
    it('should handle simple data unchanged', () => {
      const data = { name: 'John', age: 30 }
      const result = FileProcessor.processMultipartData(data)
      
      expect(result).to.deep.equal(data)
    })

    it('should convert file objects to base64 format', () => {
      const fileData = {
        fieldname: 'upload',
        originalname: 'test.txt',
        buffer: Buffer.from('Hello World', 'utf8'),
        mimetype: 'text/plain'
      }

      const data = {
        name: 'John',
        file: fileData
      }

      const result = FileProcessor.processMultipartData(data)

      expect(result.name).to.equal('John')
      expect(result.file).to.have.property('__type', 'file')
      expect(result.file).to.have.property('filename', 'test.txt')
      expect(result.file).to.have.property('data')
      
      // Decode base64 and verify content
      const decodedData = Buffer.from(result.file.data, 'base64').toString('utf8')
      expect(decodedData).to.equal('Hello World')
    })

    it('should handle arrays of files', () => {
      const fileData1 = {
        fieldname: 'uploads',
        originalname: 'file1.txt',
        buffer: Buffer.from('File 1', 'utf8')
      }

      const fileData2 = {
        fieldname: 'uploads',
        originalname: 'file2.txt',
        buffer: Buffer.from('File 2', 'utf8')
      }

      const data = {
        files: [fileData1, fileData2]
      }

      const result = FileProcessor.processMultipartData(data)

      expect(result.files).to.be.an('array')
      expect(result.files).to.have.length(2)
      
      expect(result.files[0].__type).to.equal('file')
      expect(result.files[0].filename).to.equal('file1.txt')
      expect(result.files[1].__type).to.equal('file')
      expect(result.files[1].filename).to.equal('file2.txt')
    })

    it('should handle nested objects with files', () => {
      const fileData = {
        name: 'document.pdf',
        data: Buffer.from('PDF content', 'utf8')
      }

      const data = {
        user: {
          name: 'John',
          documents: {
            resume: fileData
          }
        }
      }

      const result = FileProcessor.processMultipartData(data)

      expect(result.user.name).to.equal('John')
      expect(result.user.documents.resume.__type).to.equal('file')
      expect(result.user.documents.resume.filename).to.equal('document.pdf')
      
      const decodedData = Buffer.from(result.user.documents.resume.data, 'base64').toString('utf8')
      expect(decodedData).to.equal('PDF content')
    })

    it('should handle express-fileupload format', () => {
      const fileData = {
        name: 'upload.jpg',
        data: Buffer.from('Image data', 'utf8'),
        size: 12345,
        mimetype: 'image/jpeg'
      }

      const data = { photo: fileData }
      const result = FileProcessor.processMultipartData(data)

      expect(result.photo.__type).to.equal('file')
      expect(result.photo.filename).to.equal('upload.jpg')
      
      const decodedData = Buffer.from(result.photo.data, 'base64').toString('utf8')
      expect(decodedData).to.equal('Image data')
    })
  })

  describe('hasMultipartData', () => {
    it('should detect multipart data', () => {
      const mockReq1 = {
        is: (type: string) => type === 'multipart/form-data'
      } as any

      const mockReq2 = {
        is: (type: string) => type === 'application/json'
      } as any

      expect(FileProcessor.hasMultipartData(mockReq1)).to.be.true
      expect(FileProcessor.hasMultipartData(mockReq2)).to.be.false
    })
  })

  describe('createMulterConfig', () => {
    it('should return valid multer configuration', () => {
      const config = FileProcessor.createMulterConfig()

      expect(config).to.have.property('storage')
      expect(config).to.have.property('limits')
      expect(config.limits).to.have.property('fileSize')
      expect(config.limits).to.have.property('files')
    })
  })
})