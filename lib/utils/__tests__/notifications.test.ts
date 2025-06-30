import { beforeEach, describe, expect, it, vi } from 'vitest'

import { InternalErrorType } from '@/config/errors'
import type { InternalError } from '../error'
import { handleErrorNotification } from '../notifications'

// Mock the notifications$ state
vi.mock('@/state/notifications', () => ({
  notifications$: {
    push: vi.fn(),
  },
}))

// Import the mocked state
import { notifications$ } from '@/state/notifications'
import type { MockedFunction } from 'vitest'

const mockPush = notifications$.push as MockedFunction<typeof notifications$.push>

describe('notifications utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementation to default
    mockPush.mockImplementation(() => {})
  })

  describe('handleErrorNotification', () => {
    it('should push error notification with all fields', () => {
      const mockError: InternalError = {
        type: InternalErrorType.DEVICE_CONNECTION_FAILED,
        title: 'Connection Failed',
        description: 'Unable to connect to the Ledger device',
        originalError: new Error('USB connection lost'),
      }

      handleErrorNotification(mockError)

      expect(mockPush).toHaveBeenCalledWith({
        title: 'Connection Failed',
        description: 'Unable to connect to the Ledger device',
        type: 'error',
        autoHideDuration: 5000,
      })
      expect(mockPush).toHaveBeenCalledTimes(1)
    })

    it('should handle error with undefined description', () => {
      const mockError: InternalError = {
        type: InternalErrorType.UNKNOWN_ERROR,
        title: 'Unknown Error',
        description: undefined,
        originalError: new Error('Something went wrong'),
      }

      handleErrorNotification(mockError)

      expect(mockPush).toHaveBeenCalledWith({
        title: 'Unknown Error',
        description: '',
        type: 'error',
        autoHideDuration: 5000,
      })
    })

    it('should handle error with null description', () => {
      const mockError: InternalError = {
        type: InternalErrorType.TRANSACTION_FAILED,
        title: 'Transaction Failed',
        description: null as any,
        originalError: new Error('Transaction rejected'),
      }

      handleErrorNotification(mockError)

      expect(mockPush).toHaveBeenCalledWith({
        title: 'Transaction Failed',
        description: '',
        type: 'error',
        autoHideDuration: 5000,
      })
    })

    it('should handle error with empty description', () => {
      const mockError: InternalError = {
        type: InternalErrorType.LEDGER_ERROR,
        title: 'Ledger Error',
        description: '',
        originalError: new Error('Device error'),
      }

      handleErrorNotification(mockError)

      expect(mockPush).toHaveBeenCalledWith({
        title: 'Ledger Error',
        description: '',
        type: 'error',
        autoHideDuration: 5000,
      })
    })

    it('should handle different error types', () => {
      const errors: InternalError[] = [
        {
          type: InternalErrorType.DEVICE_CONNECTION_FAILED,
          title: 'Device Error',
          description: 'Device connection failed',
          originalError: new Error('USB error'),
        },
        {
          type: InternalErrorType.TRANSACTION_FAILED,
          title: 'Transaction Error',
          description: 'Transaction failed to execute',
          originalError: new Error('Transaction error'),
        },
        {
          type: InternalErrorType.UNKNOWN_ERROR,
          title: 'Unknown Error',
          description: 'An unknown error occurred',
          originalError: new Error('Unknown'),
        },
      ]

      errors.forEach(error => {
        handleErrorNotification(error)
      })

      expect(mockPush).toHaveBeenCalledTimes(3)
      expect(mockPush).toHaveBeenNthCalledWith(1, {
        title: 'Device Error',
        description: 'Device connection failed',
        type: 'error',
        autoHideDuration: 5000,
      })
      expect(mockPush).toHaveBeenNthCalledWith(2, {
        title: 'Transaction Error',
        description: 'Transaction failed to execute',
        type: 'error',
        autoHideDuration: 5000,
      })
      expect(mockPush).toHaveBeenNthCalledWith(3, {
        title: 'Unknown Error',
        description: 'An unknown error occurred',
        type: 'error',
        autoHideDuration: 5000,
      })
    })

    it('should always use error type for notifications', () => {
      const mockError: InternalError = {
        type: InternalErrorType.LEDGER_ERROR,
        title: 'Test Error',
        description: 'Test description',
        originalError: new Error('Test'),
      }

      handleErrorNotification(mockError)

      const notification = mockPush.mock.calls[0][0]
      expect(notification.type).toBe('error')
    })

    it('should always use 5000ms auto hide duration', () => {
      const mockError: InternalError = {
        type: InternalErrorType.LEDGER_ERROR,
        title: 'Test Error',
        description: 'Test description',
        originalError: new Error('Test'),
      }

      handleErrorNotification(mockError)

      const notification = mockPush.mock.calls[0][0]
      expect(notification.autoHideDuration).toBe(5000)
    })

    it('should handle very long titles and descriptions', () => {
      const longTitle = 'A'.repeat(200)
      const longDescription = 'B'.repeat(500)

      const mockError: InternalError = {
        type: InternalErrorType.UNKNOWN_ERROR,
        title: longTitle,
        description: longDescription,
        originalError: new Error('Long content'),
      }

      handleErrorNotification(mockError)

      expect(mockPush).toHaveBeenCalledWith({
        title: longTitle,
        description: longDescription,
        type: 'error',
        autoHideDuration: 5000,
      })
    })

    it('should handle special characters in title and description', () => {
      const specialTitle = 'Error: 🚫 Connection Failed!'
      const specialDescription = 'Unicode: 💥 HTML: <script>alert("test")</script> & symbols: @#$%'

      const mockError: InternalError = {
        type: InternalErrorType.DEVICE_CONNECTION_FAILED,
        title: specialTitle,
        description: specialDescription,
        originalError: new Error('Special chars'),
      }

      handleErrorNotification(mockError)

      expect(mockPush).toHaveBeenCalledWith({
        title: specialTitle,
        description: specialDescription,
        type: 'error',
        autoHideDuration: 5000,
      })
    })

    it('should handle multiple rapid error notifications', () => {
      const errors = Array.from({ length: 10 }, (_, i) => ({
        type: InternalErrorType.UNKNOWN_ERROR,
        title: `Error ${i}`,
        description: `Description ${i}`,
        originalError: new Error(`Error ${i}`),
      }))

      errors.forEach(error => {
        handleErrorNotification(error)
      })

      expect(mockPush).toHaveBeenCalledTimes(10)
      errors.forEach((error, i) => {
        expect(mockPush).toHaveBeenNthCalledWith(i + 1, {
          title: `Error ${i}`,
          description: `Description ${i}`,
          type: 'error',
          autoHideDuration: 5000,
        })
      })
    })

    it('should not modify the original error object', () => {
      const originalError: InternalError = {
        type: InternalErrorType.LEDGER_ERROR,
        title: 'Original Title',
        description: 'Original Description',
        originalError: new Error('Original'),
      }

      const errorCopy = { ...originalError }

      handleErrorNotification(originalError)

      // Original error should remain unchanged
      expect(originalError).toEqual(errorCopy)
    })

    it('should handle errors with minimal required fields', () => {
      const minimalError: InternalError = {
        type: InternalErrorType.UNKNOWN_ERROR,
        title: 'Minimal Error',
        // description is optional
        originalError: new Error('Minimal'),
      }

      handleErrorNotification(minimalError)

      expect(mockPush).toHaveBeenCalledWith({
        title: 'Minimal Error',
        description: '',
        type: 'error',
        autoHideDuration: 5000,
      })
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle notifications$ push throwing an error', () => {
      mockPush.mockImplementation(() => {
        throw new Error('Notification system unavailable')
      })

      const mockError: InternalError = {
        type: InternalErrorType.UNKNOWN_ERROR,
        title: 'Test Error',
        description: 'Test description',
        originalError: new Error('Test'),
      }

      expect(() => handleErrorNotification(mockError)).toThrow('Notification system unavailable')
    })

    it('should handle whitespace-only titles and descriptions', () => {
      const mockError: InternalError = {
        type: InternalErrorType.UNKNOWN_ERROR,
        title: '   ',
        description: '\t\n\r  ',
        originalError: new Error('Whitespace'),
      }

      handleErrorNotification(mockError)

      expect(mockPush).toHaveBeenCalledWith({
        title: '   ',
        description: '\t\n\r  ',
        type: 'error',
        autoHideDuration: 5000,
      })
    })

    it('should handle errors with complex original error objects', () => {
      const complexOriginalError = {
        name: 'CustomError',
        message: 'Complex error message',
        code: 'ERR_001',
        stack: 'Error stack trace...',
        details: { nested: { data: 'value' } },
      }

      const mockError: InternalError = {
        type: InternalErrorType.LEDGER_ERROR,
        title: 'Complex Error',
        description: 'Error with complex original error',
        originalError: complexOriginalError as any,
      }

      handleErrorNotification(mockError)

      expect(mockPush).toHaveBeenCalledWith({
        title: 'Complex Error',
        description: 'Error with complex original error',
        type: 'error',
        autoHideDuration: 5000,
      })
    })
  })
})