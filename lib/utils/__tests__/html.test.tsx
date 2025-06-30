import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import type { MockedFunction } from 'vitest'

import { muifyHtml } from '../html'

// Mock DOMPurify
vi.mock('isomorphic-dompurify', () => ({
  default: {
    sanitize: vi.fn(),
  },
}))

// Mock html-react-parser
vi.mock('html-react-parser', () => ({
  default: vi.fn(),
  domToReact: vi.fn((children, options) => children),
}))

// Import mocked modules
import DOMPurify from 'isomorphic-dompurify'
import HTMLReactParser from 'html-react-parser'

const mockSanitize = DOMPurify.sanitize as MockedFunction<typeof DOMPurify.sanitize>
const mockHTMLReactParser = HTMLReactParser as MockedFunction<typeof HTMLReactParser>

describe('html utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSanitize.mockImplementation((input: string) => input) // Return input as-is by default
    mockHTMLReactParser.mockImplementation(() => <div>Parsed HTML</div>)
  })

  describe('muifyHtml', () => {
    it('should sanitize HTML input using DOMPurify', () => {
      const htmlInput = '<script>alert("xss")</script><p>Safe content</p>'
      const sanitizedHtml = '<p>Safe content</p>'
      
      mockSanitize.mockReturnValue(sanitizedHtml)
      mockHTMLReactParser.mockReturnValue(<div>Safe content</div>)

      muifyHtml(htmlInput)

      expect(mockSanitize).toHaveBeenCalledWith(htmlInput)
    })

    it('should parse sanitized HTML with HTMLReactParser', () => {
      const htmlInput = '<p>Test content</p>'
      const sanitizedHtml = '<p>Test content</p>'
      
      mockSanitize.mockReturnValue(sanitizedHtml)
      mockHTMLReactParser.mockReturnValue(<div>Test content</div>)

      const result = muifyHtml(htmlInput)

      expect(mockHTMLReactParser).toHaveBeenCalledWith(sanitizedHtml, expect.any(Object))
      expect(result).toEqual(<div>Test content</div>)
    })

    it('should handle empty string input', () => {
      const htmlInput = ''
      
      mockSanitize.mockReturnValue('')
      mockHTMLReactParser.mockReturnValue(null)

      const result = muifyHtml(htmlInput)

      expect(mockSanitize).toHaveBeenCalledWith('')
      expect(mockHTMLReactParser).toHaveBeenCalledWith('', expect.any(Object))
      expect(result).toBeNull()
    })

    it('should handle malicious script tags', () => {
      const maliciousHtml = '<script>document.cookie</script><p>Content</p>'
      const sanitizedHtml = '<p>Content</p>' // DOMPurify removes script tags
      
      mockSanitize.mockReturnValue(sanitizedHtml)
      mockHTMLReactParser.mockReturnValue(<p>Content</p>)

      muifyHtml(maliciousHtml)

      expect(mockSanitize).toHaveBeenCalledWith(maliciousHtml)
      expect(mockHTMLReactParser).toHaveBeenCalledWith(sanitizedHtml, expect.any(Object))
    })

    it('should handle iframe and object tags', () => {
      const htmlWithIframe = '<iframe src="http://evil.com"></iframe><p>Safe content</p>'
      const sanitizedHtml = '<p>Safe content</p>' // DOMPurify removes iframe
      
      mockSanitize.mockReturnValue(sanitizedHtml)
      mockHTMLReactParser.mockReturnValue(<p>Safe content</p>)

      muifyHtml(htmlWithIframe)

      expect(mockSanitize).toHaveBeenCalledWith(htmlWithIframe)
    })

    it('should handle HTML with inline styles and attributes', () => {
      const htmlWithStyles = '<p style="color: red;" onclick="alert()">Styled content</p>'
      const sanitizedHtml = '<p>Styled content</p>' // DOMPurify removes dangerous attributes
      
      mockSanitize.mockReturnValue(sanitizedHtml)
      mockHTMLReactParser.mockReturnValue(<p>Styled content</p>)

      muifyHtml(htmlWithStyles)

      expect(mockSanitize).toHaveBeenCalledWith(htmlWithStyles)
    })

    it('should preserve safe HTML elements', () => {
      const safeHtml = '<p>Paragraph</p><ul><li>List item</li></ul><h5>Heading</h5>'
      
      mockSanitize.mockReturnValue(safeHtml)
      mockHTMLReactParser.mockReturnValue(<div>Safe HTML elements</div>)

      const result = muifyHtml(safeHtml)

      expect(mockSanitize).toHaveBeenCalledWith(safeHtml)
      expect(mockHTMLReactParser).toHaveBeenCalledWith(safeHtml, expect.any(Object))
    })

    it('should handle links with href attributes', () => {
      const htmlWithLinks = '<a href="https://example.com">External link</a>'
      
      mockSanitize.mockReturnValue(htmlWithLinks)
      mockHTMLReactParser.mockReturnValue(<a href="https://example.com">External link</a>)

      muifyHtml(htmlWithLinks)

      expect(mockSanitize).toHaveBeenCalledWith(htmlWithLinks)
    })

    it('should handle complex nested HTML structures', () => {
      const complexHtml = '<div><ul><li><h5>Title</h5><p>Content</p></li></ul></div>'
      
      mockSanitize.mockReturnValue(complexHtml)
      mockHTMLReactParser.mockReturnValue(<div>Complex structure</div>)

      const result = muifyHtml(complexHtml)

      expect(mockSanitize).toHaveBeenCalledWith(complexHtml)
      expect(result).toEqual(<div>Complex structure</div>)
    })

    it('should handle HTML entities', () => {
      const htmlWithEntities = '<p>&lt;script&gt;alert()&lt;/script&gt;</p>'
      
      mockSanitize.mockReturnValue(htmlWithEntities)
      mockHTMLReactParser.mockReturnValue(<p>&lt;script&gt;alert()&lt;/script&gt;</p>)

      muifyHtml(htmlWithEntities)

      expect(mockSanitize).toHaveBeenCalledWith(htmlWithEntities)
    })

    it('should handle unicode and special characters', () => {
      const unicodeHtml = '<p>Unicode: 🔥 Special: &amp; &quot;</p>'
      
      mockSanitize.mockReturnValue(unicodeHtml)
      mockHTMLReactParser.mockReturnValue(<p>Unicode: 🔥 Special: &amp; &quot;</p>)

      const result = muifyHtml(unicodeHtml)

      expect(mockSanitize).toHaveBeenCalledWith(unicodeHtml)
      expect(result).toEqual(<p>Unicode: 🔥 Special: &amp; &quot;</p>)
    })

    it('should pass correct options to HTMLReactParser', () => {
      const htmlInput = '<p>Test</p>'
      
      mockSanitize.mockReturnValue(htmlInput)
      mockHTMLReactParser.mockReturnValue(<p>Test</p>)

      muifyHtml(htmlInput)

      expect(mockHTMLReactParser).toHaveBeenCalledWith(
        htmlInput,
        expect.objectContaining({
          replace: expect.any(Function),
        })
      )
    })

    it('should handle null and undefined inputs gracefully', () => {
      // TODO: review expectations - verify behavior with null/undefined inputs
      const nullInput = null as any
      
      mockSanitize.mockReturnValue('')
      mockHTMLReactParser.mockReturnValue(null)

      muifyHtml(nullInput)

      expect(mockSanitize).toHaveBeenCalledWith(nullInput)
    })

    it('should handle very large HTML strings', () => {
      const largeHtml = '<p>' + 'a'.repeat(10000) + '</p>'
      
      mockSanitize.mockReturnValue(largeHtml)
      mockHTMLReactParser.mockReturnValue(<p>Large content</p>)

      const result = muifyHtml(largeHtml)

      expect(mockSanitize).toHaveBeenCalledWith(largeHtml)
      expect(result).toEqual(<p>Large content</p>)
    })

    it('should handle malformed HTML gracefully', () => {
      const malformedHtml = '<p><div>Unclosed tags<span>'
      const sanitizedMalformed = '<p><div>Unclosed tags<span></span></div></p>' // DOMPurify fixes structure
      
      mockSanitize.mockReturnValue(sanitizedMalformed)
      mockHTMLReactParser.mockReturnValue(<div>Fixed HTML</div>)

      muifyHtml(malformedHtml)

      expect(mockSanitize).toHaveBeenCalledWith(malformedHtml)
    })
  })
})