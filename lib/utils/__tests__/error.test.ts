import { ResponseError } from '@zondax/ledger-js'
import { InternalErrorType } from 'config/errors'
import { describe, expect, it } from 'vitest'

import { InternalError, interpretLedgerClientError, interpretLedgerJsError, interpretUnknownError } from '../error'

describe('error utilities', () => {
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
      const responseError = new ResponseError('Test error')
      responseError.returnCode = 0x6982 // Assuming this maps to a known error

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
      const responseError = new ResponseError('Test error')
      responseError.returnCode = 0x6982

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
  })
})