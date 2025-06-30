import { beforeEach, describe, expect, it, vi } from 'vitest'

import { copyContent } from '../clipboard'

// Mock navigator.clipboard
const mockWriteText = vi.fn()
Object.defineProperty(global, 'navigator', {
  value: {
    clipboard: {
      writeText: mockWriteText,
    },
  },
  configurable: true,
})

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('clipboard utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleError.mockClear()
  })

  describe('copyContent', () => {
    it('should successfully copy text to clipboard', async () => {
      const textToCopy = 'Hello, World!'
      mockWriteText.mockResolvedValue(undefined)

      const result = await copyContent(textToCopy)

      expect(mockWriteText).toHaveBeenCalledWith('Hello, World!')
      expect(result).toEqual({ success: true })
      expect(mockConsoleError).not.toHaveBeenCalled()
    })

    it('should convert non-string input to string', async () => {
      const numberToCopy = 12345
      mockWriteText.mockResolvedValue(undefined)

      // @ts-expect-error Testing number input to string conversion
      const result = await copyContent(numberToCopy)

      expect(mockWriteText).toHaveBeenCalledWith('12345')
      expect(result).toEqual({ success: true })
    })

    it('should handle empty string', async () => {
      mockWriteText.mockResolvedValue(undefined)

      const result = await copyContent('')

      expect(mockWriteText).toHaveBeenCalledWith('')
      expect(result).toEqual({ success: true })
    })

    it('should handle clipboard API failure', async () => {
      const textToCopy = 'Test text'
      const mockError = new Error('Clipboard API not available')
      mockWriteText.mockRejectedValue(mockError)

      const result = await copyContent(textToCopy)

      expect(mockWriteText).toHaveBeenCalledWith('Test text')
      expect(result).toEqual({ success: false, error: mockError })
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to copy content:', mockError)
    })

    it('should handle permission denied error', async () => {
      const textToCopy = 'Sensitive data'
      const permissionError = new Error('Permission denied')
      mockWriteText.mockRejectedValue(permissionError)

      const result = await copyContent(textToCopy)

      expect(result).toEqual({ success: false, error: permissionError })
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to copy content:', permissionError)
    })

    it('should handle browser compatibility issues', async () => {
      const textToCopy = 'Browser test'
      const domError = new DOMException('The request is not allowed', 'NotAllowedError')
      mockWriteText.mockRejectedValue(domError)

      const result = await copyContent(textToCopy)

      expect(result).toEqual({ success: false, error: domError })
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to copy content:', domError)
    })

    it('should handle very long text', async () => {
      const longText = 'A'.repeat(10000)
      mockWriteText.mockResolvedValue(undefined)

      const result = await copyContent(longText)

      expect(mockWriteText).toHaveBeenCalledWith(longText)
      expect(result).toEqual({ success: true })
    })

    it('should handle special characters and unicode', async () => {
      const specialText = '😀🎉 Special chars: àáâã & <script>alert("test")</script>'
      mockWriteText.mockResolvedValue(undefined)

      const result = await copyContent(specialText)

      expect(mockWriteText).toHaveBeenCalledWith(specialText)
      expect(result).toEqual({ success: true })
    })

    it('should handle null/undefined clipboard error', async () => {
      // TODO: review expectations - verify handling of null/undefined errors from clipboard API
      const textToCopy = 'Test'
      mockWriteText.mockRejectedValue(null)

      const result = await copyContent(textToCopy)

      expect(result).toEqual({ success: false, error: null })
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to copy content:', null)
    })

    it('should handle string error instead of Error object', async () => {
      const textToCopy = 'Test'
      const stringError = 'Clipboard unavailable'
      mockWriteText.mockRejectedValue(stringError)

      const result = await copyContent(textToCopy)

      expect(result).toEqual({ success: false, error: stringError })
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to copy content:', stringError)
    })
  })
})