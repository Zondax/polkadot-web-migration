import { ResponseError } from '@zondax/ledger-js'
import { InternalErrorType } from 'config/errors'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  InternalError,
  interpretError,
  interpretLedgerClientError,
  interpretLedgerJsError,
  interpretUnknownError,
  withErrorHandling,
} from '../error'

describe('error utilities', () => {
  // Mock console.debug for all tests to avoid console output
  let mockConsoleDebug: any

  beforeEach(() => {
    mockConsoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    mockConsoleDebug.mockRestore()
    vi.clearAllMocks()
  })

  describe('InternalError class', () => {
    it('should create internal error with basic type', () => {
      const error = new InternalError(InternalErrorType.APP_DOES_NOT_SEE_TO_BE_OPEN)

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(InternalError)
      expect(error.errorType).toBe(InternalErrorType.APP_DOES_NOT_SEE_TO_BE_OPEN)
      expect(error.title).toBe('App Not Open')
    })

    it('should create internal error with custom details', () => {
      const error = new InternalError(InternalErrorType.CONNECTION_ERROR, {
        operation: 'test-operation',
        context: { deviceId: '123' },
      })

      expect(error.errorType).toBe(InternalErrorType.CONNECTION_ERROR)
      expect(error.operation).toBe('test-operation')
      expect(error.context).toEqual({ deviceId: '123' })
    })
  })

  describe('interpretLedgerJsError', () => {
    it('should interpret ResponseError correctly', () => {
      const responseError = new ResponseError(0x6982, 'Test error')

      const result = interpretLedgerJsError(responseError)

      expect(result).toBeInstanceOf(InternalError)
      // TODO: review expectations - verify error mapping is correct for specific return codes
    })
  })

  describe('interpretLedgerClientError', () => {
    it('should return InternalError as-is', () => {
      const internalError = new InternalError(InternalErrorType.APP_NOT_OPEN)

      const result = interpretLedgerClientError(internalError)

      expect(result).toBe(internalError)
    })

    it('should interpret ResponseError', () => {
      const responseError = new ResponseError(0x6982, 'Test error')

      const result = interpretLedgerClientError(responseError)

      expect(result).toBeInstanceOf(InternalError)
    })

    it('should handle unknown errors', () => {
      const unknownError = new Error('Unknown error')

      const result = interpretLedgerClientError(unknownError)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.errorType).toBe('unknown_error')
    })
  })

  describe('interpretUnknownError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error message')

      const result = interpretUnknownError(error)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.errorType).toBe('unknown_error')
      // TODO: review expectations - verify error context structure for different error types
    })

    it('should handle string errors', () => {
      const error = 'String error message'

      const result = interpretUnknownError(error)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.errorType).toBe('unknown_error')
    })

    it('should handle null/undefined errors', () => {
      const result1 = interpretUnknownError(null)
      const result2 = interpretUnknownError(undefined)

      expect(result1).toBeInstanceOf(InternalError)
      expect(result2).toBeInstanceOf(InternalError)
      expect(result1.errorType).toBe('unknown_error')
      expect(result2.errorType).toBe('unknown_error')
    })

    it('should handle object errors', () => {
      const error = { code: 'TEST_ERROR', details: 'test details' }

      const result = interpretUnknownError(error)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.errorType).toBe('unknown_error')
    })

    it('should use custom default error type', () => {
      const error = new Error('Test error')
      const customDefaultError = InternalErrorType.CONNECTION_ERROR

      const result = interpretUnknownError(error, customDefaultError)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.errorType).toBe(customDefaultError)
    })

    it('should handle errors with custom name property', () => {
      const error = { name: 'CustomError', message: 'Custom message' }

      const result = interpretUnknownError(error)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.errorType).toBe('unknown_error')
    })
  })

  describe('interpretError', () => {
    it('should return InternalError as-is', () => {
      const internalError = new InternalError(InternalErrorType.APP_NOT_OPEN)

      const result = interpretError(internalError, InternalErrorType.UNKNOWN_ERROR)

      expect(result).toBe(internalError)
    })

    it('should interpret unknown errors with default error type', () => {
      const unknownError = new Error('Unknown error')
      const defaultError = InternalErrorType.CONNECTION_ERROR

      const result = interpretError(unknownError, defaultError)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.errorType).toBe(defaultError)
    })

    it('should handle null errors', () => {
      const result = interpretError(null, InternalErrorType.APP_NOT_OPEN)

      expect(result).toBeInstanceOf(InternalError)
      expect(result.errorType).toBe(InternalErrorType.APP_NOT_OPEN)
    })
  })

  describe('withErrorHandling', () => {
    it('should execute function successfully', async () => {
      const mockFn = vi.fn().mockResolvedValue('success')

      const result = await withErrorHandling(mockFn, {
        errorCode: InternalErrorType.UNKNOWN_ERROR,
        operation: 'test-op',
        context: { test: true },
      })

      expect(result).toBe('success')
      expect(mockFn).toHaveBeenCalled()
      expect(mockConsoleDebug).not.toHaveBeenCalled()
    })

    it('should handle and transform errors', async () => {
      const originalError = new Error('Test error')
      const mockFn = vi.fn().mockRejectedValue(originalError)

      await expect(
        withErrorHandling(mockFn, {
          errorCode: InternalErrorType.CONNECTION_ERROR,
          operation: 'test-operation',
          context: { deviceId: '123' },
        })
      ).rejects.toThrow(InternalError)

      try {
        await withErrorHandling(mockFn, {
          errorCode: InternalErrorType.CONNECTION_ERROR,
          operation: 'test-operation',
          context: { deviceId: '123' },
        })
      } catch (error) {
        expect(error).toBeInstanceOf(InternalError)
        expect((error as InternalError).operation).toBe('test-operation')
        expect((error as InternalError).context).toEqual({ deviceId: '123' })
      }

      expect(mockConsoleDebug).toHaveBeenCalled()
    })

    it('should handle InternalError without overriding existing properties', async () => {
      const internalError = new InternalError(InternalErrorType.APP_NOT_OPEN, {
        operation: 'existing-op',
        context: { existing: true },
      })
      const mockFn = vi.fn().mockRejectedValue(internalError)

      try {
        await withErrorHandling(mockFn, {
          errorCode: InternalErrorType.UNKNOWN_ERROR,
          operation: 'new-op',
          context: { new: true },
        })
      } catch (error) {
        expect(error).toBe(internalError)
        expect((error as InternalError).operation).toBe('existing-op')
        expect((error as InternalError).context).toEqual({ existing: true })
      }
    })

    it('should handle ResponseError', async () => {
      const responseError = new ResponseError(0x6982, 'Ledger error')
      const mockFn = vi.fn().mockRejectedValue(responseError)

      await expect(
        withErrorHandling(mockFn, {
          errorCode: InternalErrorType.UNKNOWN_ERROR,
        })
      ).rejects.toThrow(InternalError)

      expect(mockConsoleDebug).toHaveBeenCalled()
    })

    it('should add operation and context when not present in error', async () => {
      const error = new Error('Test error')
      const mockFn = vi.fn().mockRejectedValue(error)

      try {
        await withErrorHandling(mockFn, {
          errorCode: InternalErrorType.UNKNOWN_ERROR,
          operation: 'test-op',
          context: { test: 'value' },
        })
      } catch (e) {
        expect(e).toBeInstanceOf(InternalError)
        expect((e as InternalError).operation).toBe('test-op')
        expect((e as InternalError).context).toEqual({ test: 'value' })
      }
    })

    it('should handle functions that return different types', async () => {
      const mockFnNumber = vi.fn().mockResolvedValue(42)
      const mockFnObject = vi.fn().mockResolvedValue({ data: 'test' })
      const mockFnArray = vi.fn().mockResolvedValue([1, 2, 3])

      const resultNumber = await withErrorHandling(mockFnNumber, {
        errorCode: InternalErrorType.UNKNOWN_ERROR,
      })
      const resultObject = await withErrorHandling(mockFnObject, {
        errorCode: InternalErrorType.UNKNOWN_ERROR,
      })
      const resultArray = await withErrorHandling(mockFnArray, {
        errorCode: InternalErrorType.UNKNOWN_ERROR,
      })

      expect(resultNumber).toBe(42)
      expect(resultObject).toEqual({ data: 'test' })
      expect(resultArray).toEqual([1, 2, 3])
    })
  })
})
