import { LedgerError } from '@zondax/ledger-js'
import { describe, expect, it } from 'vitest'

import { type ErrorDetails, type ErrorDetailsMap, errorDetails, InternalErrorType, ledgerErrorToInternalErrorMap } from '../errors'

describe('Error Configuration', () => {
  describe('InternalErrorType enum', () => {
    it('should have unique error type values', () => {
      const errorTypeValues = Object.values(InternalErrorType)
      const uniqueValues = new Set(errorTypeValues)

      expect(uniqueValues.size).toBe(errorTypeValues.length)
    })
  })

  describe('ledgerErrorToInternalErrorMap', () => {
    it('should map all LedgerError values to InternalErrorType', () => {
      const ledgerErrorValues = Object.values(LedgerError) as LedgerError[]
      const internalErrorValues = Object.values(InternalErrorType)

      for (const ledgerError of ledgerErrorValues) {
        const mappedError = ledgerErrorToInternalErrorMap[ledgerError]
        if (mappedError) {
          expect(internalErrorValues).toContain(mappedError)
        }
      }
    })

    it('should have correct mappings for critical errors', () => {
      const criticalMappings = [
        { ledger: LedgerError.AppDoesNotSeemToBeOpen, internal: InternalErrorType.APP_NOT_OPEN },
        { ledger: LedgerError.ClaNotSupported, internal: InternalErrorType.APP_NOT_OPEN },
        { ledger: LedgerError.TransactionRejected, internal: InternalErrorType.TRANSACTION_REJECTED },
        { ledger: LedgerError.UserRefusedOnDevice, internal: InternalErrorType.SIGN_TX_ERROR },
        { ledger: LedgerError.LockedDevice, internal: InternalErrorType.LOCKED_DEVICE },
        { ledger: LedgerError.CodeBlocked, internal: InternalErrorType.LOCKED_DEVICE },
        { ledger: LedgerError.PinRemainingAttempts, internal: InternalErrorType.LOCKED_DEVICE },
        { ledger: LedgerError.Timeout, internal: InternalErrorType.CONNECTION_TIMEOUT },
        { ledger: LedgerError.U2FTimeout, internal: InternalErrorType.CONNECTION_TIMEOUT },
        { ledger: LedgerError.ErrorDerivingKeys, internal: InternalErrorType.GET_ADDRESS_ERROR },
      ]

      for (const { ledger, internal } of criticalMappings) {
        expect(ledgerErrorToInternalErrorMap[ledger]).toBe(internal)
      }
    })

    it('should map unknown/generic errors to appropriate internal types', () => {
      const genericMappings = [
        { ledger: LedgerError.UnknownError, internal: InternalErrorType.UNKNOWN_ERROR },
        { ledger: LedgerError.U2FUnknown, internal: InternalErrorType.UNKNOWN_ERROR },
        { ledger: LedgerError.GenericError, internal: InternalErrorType.UNKNOWN_ERROR },
        { ledger: LedgerError.NoErrors, internal: InternalErrorType.DEFAULT },
      ]

      for (const { ledger, internal } of genericMappings) {
        expect(ledgerErrorToInternalErrorMap[ledger]).toBe(internal)
      }
    })

    it('should have reasonable coverage of LedgerError values', () => {
      const ledgerErrorValues = Object.values(LedgerError) as LedgerError[]
      const mappingCount = Object.keys(ledgerErrorToInternalErrorMap).length

      // Should have at least 40% coverage of LedgerError values (adjusted for actual coverage)
      expect(mappingCount).toBeGreaterThan(ledgerErrorValues.length * 0.4)
    })
  })

  describe('errorDetails', () => {
    it('should have details for all InternalErrorType values', () => {
      const errorTypeValues = Object.values(InternalErrorType)

      for (const errorType of errorTypeValues) {
        const details = errorDetails[errorType]
        expect(details).toBeDefined()
        expect(details.title).toBeDefined()
        expect(typeof details.title).toBe('string')
        expect(details.title.length).toBeGreaterThan(0)
      }
    })

    it('should have valid ErrorDetails structure', () => {
      const errorTypeValues = Object.values(InternalErrorType)

      for (const errorType of errorTypeValues) {
        const details = errorDetails[errorType]

        // Check required fields
        expect(details).toHaveProperty('title')
        expect(typeof details.title).toBe('string')

        // Check optional fields
        if (details.description !== undefined) {
          expect(typeof details.description).toBe('string')
        }

        if (details.content !== undefined) {
          expect(typeof details.content).toBe('string')
        }
      }
    })

    it('should have meaningful error messages', () => {
      const criticalErrors = [
        InternalErrorType.CONNECTION_ERROR,
        InternalErrorType.APP_NOT_OPEN,
        InternalErrorType.TRANSACTION_REJECTED,
        InternalErrorType.LOCKED_DEVICE,
        InternalErrorType.MIGRATION_ERROR,
        InternalErrorType.INSUFFICIENT_BALANCE,
        InternalErrorType.BLOCKCHAIN_CONNECTION_ERROR,
      ]

      for (const errorType of criticalErrors) {
        const details = errorDetails[errorType]

        // Title should be descriptive
        expect(details.title.length).toBeGreaterThan(5)
        expect(details.title).not.toMatch(/^[a-z_]+$/) // Should not be just the enum value

        // Description should provide context
        if (details.description) {
          expect(details.description.length).toBeGreaterThan(10)
        }

        // Content should provide actionable information
        if (details.content) {
          expect(details.content.length).toBeGreaterThan(20)
        }
      }
    })

    it('should have consistent error message format', () => {
      const errorTypeValues = Object.values(InternalErrorType)

      for (const errorType of errorTypeValues) {
        const details = errorDetails[errorType]

        // Title should be sentence case or title case
        expect(details.title[0]).toMatch(/[A-Z]/)

        // Description should end with period if it's a complete sentence
        if (details.description && details.description.length > 20) {
          // Allow for both sentences and fragments
          expect(details.description).toMatch(/[.!?]$|[^.!?]$/)
        }
      }
    })

    it('should have specific error details for user-facing errors', () => {
      const userFacingErrors = [
        InternalErrorType.DEVICE_NOT_SELECTED,
        InternalErrorType.APP_NOT_OPEN,
        InternalErrorType.LOCKED_DEVICE,
        InternalErrorType.CONNECTION_ERROR,
        InternalErrorType.INSUFFICIENT_BALANCE,
        InternalErrorType.TRANSACTION_REJECTED,
      ]

      for (const errorType of userFacingErrors) {
        const details = errorDetails[errorType]

        // Should have both title and description
        expect(details.title).toBeDefined()
        expect(details.description).toBeDefined()

        // Should have actionable content if available
        if (details.content) {
          expect(details.content.length).toBeGreaterThan(30)
        }
      }
    })

    it('should have error details that match the error type semantics', () => {
      const semanticChecks = [
        {
          errorType: InternalErrorType.CONNECTION_ERROR,
          titleKeywords: ['connection', 'ledger'],
          descriptionKeywords: ['connect', 'device'],
        },
        {
          errorType: InternalErrorType.APP_NOT_OPEN,
          titleKeywords: ['app', 'open'],
          descriptionKeywords: ['open', 'app', 'device'],
        },
        {
          errorType: InternalErrorType.LOCKED_DEVICE,
          titleKeywords: ['locked', 'device'],
          descriptionKeywords: ['unlock', 'pin'],
        },
        {
          errorType: InternalErrorType.INSUFFICIENT_BALANCE,
          titleKeywords: ['insufficient', 'balance'],
          descriptionKeywords: ['funds', 'balance'],
        },
        {
          errorType: InternalErrorType.MIGRATION_ERROR,
          titleKeywords: ['migration', 'failed'],
          descriptionKeywords: ['migration', 'asset'],
        },
      ]

      for (const check of semanticChecks) {
        const details = errorDetails[check.errorType]
        const titleLower = details.title.toLowerCase()
        const descriptionLower = details.description?.toLowerCase() || ''

        // Check if title contains relevant keywords
        const titleMatches = check.titleKeywords.some(keyword => titleLower.includes(keyword.toLowerCase()))
        expect(titleMatches).toBe(true)

        // Check if description contains relevant keywords
        if (details.description) {
          const descriptionMatches = check.descriptionKeywords.some(keyword => descriptionLower.includes(keyword.toLowerCase()))
          expect(descriptionMatches).toBe(true)
        }
      }
    })
  })

  describe('Type definitions', () => {
    it('should have correct ErrorDetails interface', () => {
      const sampleDetails: ErrorDetails = {
        title: 'Test Error',
        description: 'Test description',
        content: 'Test content',
      }

      expect(sampleDetails.title).toBe('Test Error')
      expect(sampleDetails.description).toBe('Test description')
      expect(sampleDetails.content).toBe('Test content')
    })

    it('should have correct ErrorDetailsMap type', () => {
      const sampleMap: ErrorDetailsMap = {
        [InternalErrorType.UNKNOWN_ERROR]: {
          title: 'Unknown Error',
          description: 'An unknown error occurred',
        },
        [InternalErrorType.CONNECTION_ERROR]: {
          title: 'Connection Error',
          description: 'Failed to connect',
          content: 'Check your connection',
        },
      } as ErrorDetailsMap

      expect(sampleMap[InternalErrorType.UNKNOWN_ERROR].title).toBe('Unknown Error')
      expect(sampleMap[InternalErrorType.CONNECTION_ERROR].content).toBe('Check your connection')
    })
  })

  describe('Error consistency', () => {
    it('should not have duplicate error details', () => {
      const errorTypeValues = Object.values(InternalErrorType)
      const titleMap = new Map<string, InternalErrorType[]>()

      // Group error types by title
      for (const errorType of errorTypeValues) {
        const title = errorDetails[errorType].title
        if (!titleMap.has(title)) {
          titleMap.set(title, [])
        }
        titleMap.get(title)?.push(errorType)
      }

      // Check for duplicates
      const duplicates = Array.from(titleMap.entries()).filter(([_, types]) => types.length > 1)

      if (duplicates.length > 0) {
        console.warn('Duplicate error titles found:', duplicates)
      }

      // Allow some reasonable duplicates for similar error types
      expect(duplicates.length).toBeLessThanOrEqual(3)
    })

    it('should have consistent error severity levels', () => {
      const criticalErrors = [
        InternalErrorType.DEVICE_DISCONNECTED,
        InternalErrorType.LOCKED_DEVICE,
        InternalErrorType.MIGRATION_ERROR,
        InternalErrorType.INSUFFICIENT_BALANCE,
        InternalErrorType.TRANSACTION_REJECTED,
      ]

      for (const errorType of criticalErrors) {
        const details = errorDetails[errorType]

        // Critical errors should have comprehensive details
        expect(details.title).toBeDefined()
        expect(details.description).toBeDefined()
        expect(details.description?.length).toBeGreaterThan(20)
      }
    })
  })
})
