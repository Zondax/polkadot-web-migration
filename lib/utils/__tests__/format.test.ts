import { BN } from '@polkadot/util'
import type { ResponseVersion } from '@zondax/ledger-js'
import { describe, expect, it } from 'vitest'

import type { Token } from '@/config/apps'
import { convertToRawUnits, formatBalance, formatVersion, truncateMiddleOfString } from '../format'

describe('format utilities', () => {
  describe('truncateMiddleOfString', () => {
    it('should return null for empty string', () => {
      expect(truncateMiddleOfString('', 10)).toBeNull()
    })

    it('should return null for null/undefined', () => {
      expect(truncateMiddleOfString(null as any, 10)).toBeNull()
      expect(truncateMiddleOfString(undefined as any, 10)).toBeNull()
    })

    it('should return unchanged string if shorter than maxLength', () => {
      expect(truncateMiddleOfString('hello', 10)).toBe('hello')
      expect(truncateMiddleOfString('test', 10)).toBe('test')
    })

    it('should return unchanged string if equal to maxLength', () => {
      expect(truncateMiddleOfString('exactly10!', 10)).toBe('exactly10!')
    })

    it('should truncate middle for longer strings', () => {
      // maxLength 10, middle = 5, so 5 chars from start and 5 from end
      expect(truncateMiddleOfString('0x1234567890abcdef', 10)).toBe('0x123...bcdef')
      expect(truncateMiddleOfString('this is a very long string', 10)).toBe('this ...tring')
    })

    it('should handle odd maxLength', () => {
      // maxLength 9, middle = 4, so 4 chars from start and 4 from end (plus ...)
      expect(truncateMiddleOfString('0x1234567890abcdef', 9)).toBe('0x12...cdef')
    })

    it('should handle very small maxLength', () => {
      expect(truncateMiddleOfString('longstring', 4)).toBe('lo...ng')
      expect(truncateMiddleOfString('test', 2)).toBe('t...t')
    })

    it('should handle maxLength of 1', () => {
      // maxLength 1, middle = 0, so 0 chars from start and 0 from end
      expect(truncateMiddleOfString('test', 1)).toBe('...')
    })

    it('should handle Unicode characters', () => {
      // Unicode characters can be problematic with substring, let's test actual output
      const result = truncateMiddleOfString('🔥🎉🚀🌟💎🏆🎯', 6)
      expect(result).toContain('...')
      expect(result.length).toBeLessThanOrEqual(9) // 6 + '...'
    })
  })

  describe('formatBalance', () => {
    const mockToken: Token = {
      symbol: 'DOT',
      decimals: 10,
      category: 'substrate',
      name: 'Polkadot',
      chainName: 'Polkadot',
    }

    describe('zero balance', () => {
      it('should format zero balance without token', () => {
        expect(formatBalance(new BN(0))).toBe('0')
      })

      it('should format zero balance with token', () => {
        expect(formatBalance(new BN(0), mockToken)).toBe('0 DOT')
      })

      it('should format zero balance with hideTokenSymbol', () => {
        expect(formatBalance(new BN(0), mockToken, 4, true)).toBe('0')
      })
    })

    describe('with decimals', () => {
      it('should format whole numbers correctly', () => {
        const balance = new BN('10000000000') // 1 DOT (10 decimals)
        expect(formatBalance(balance, mockToken)).toBe('1 DOT')
      })

      it('should format large whole numbers with commas', () => {
        const balance = new BN('12340000000000') // 1234 DOT
        expect(formatBalance(balance, mockToken)).toBe('1,234 DOT')
      })

      it('should format fractional amounts', () => {
        const balance = new BN('15000000000') // 1.5 DOT
        expect(formatBalance(balance, mockToken)).toBe('1.5 DOT')
      })

      it('should handle maxDecimals parameter', () => {
        const balance = new BN('10123456789') // 1.0123456789 DOT
        expect(formatBalance(balance, mockToken, 2)).toBe('1.01 DOT')
        expect(formatBalance(balance, mockToken, 4)).toBe('1.0123 DOT')
      })

      it('should trim trailing zeros from decimals', () => {
        const balance = new BN('10100000000') // 1.01 DOT
        expect(formatBalance(balance, mockToken)).toBe('1.01 DOT')
      })

      it('should hide token symbol when requested', () => {
        const balance = new BN('10000000000') // 1 DOT
        expect(formatBalance(balance, mockToken, 4, true)).toBe('1')
      })

      it('should handle very small amounts', () => {
        const balance = new BN('1') // 0.0000000001 DOT
        // Due to default maxDecimals behavior, very small amounts may show as 0
        expect(formatBalance(balance, mockToken)).toBe('0 DOT')
        // But with sufficient maxDecimals, it shows the value
        expect(formatBalance(balance, mockToken, 10)).toBe('0.0000000001 DOT')
      })

      it('should handle very large amounts', () => {
        const balance = new BN('999999999999999999999') // Very large amount
        // Default behavior limits decimal display
        expect(formatBalance(balance, mockToken)).toBe('99,999,999,999.9999 DOT')
        // With maxDecimals set to 10, shows all decimals
        expect(formatBalance(balance, mockToken, 10)).toBe('99,999,999,999.9999999999 DOT')
      })

      it('should handle amounts with all decimal places', () => {
        const balance = new BN('9999999999') // 0.9999999999 DOT
        expect(formatBalance(balance, mockToken, 5)).toBe('0.99999 DOT')
      })
    })

    describe('without decimals', () => {
      const integerToken: Token = {
        symbol: 'NFT',
        decimals: 0,
        category: 'substrate',
        name: 'NFT Token',
        chainName: 'NFT Chain',
      }

      it('should format integer amounts', () => {
        expect(formatBalance(new BN('1'), integerToken)).toBe('1 NFT')
        expect(formatBalance(new BN('1000'), integerToken)).toBe('1,000 NFT')
        expect(formatBalance(new BN('1000000'), integerToken)).toBe('1,000,000 NFT')
      })

      it('should format without symbol when hideTokenSymbol is true', () => {
        expect(formatBalance(new BN('1000'), integerToken, 0, true)).toBe('1,000')
      })
    })

    describe('without token', () => {
      it('should format balance without token info', () => {
        expect(formatBalance(new BN('1000'))).toBe('1,000')
        expect(formatBalance(new BN('1000000'))).toBe('1,000,000')
      })

      it('should handle undefined token with decimals', () => {
        expect(formatBalance(new BN('1000'), undefined, 2)).toBe('1,000')
      })
    })

    describe('edge cases', () => {
      it('should handle token with undefined decimals', () => {
        const tokenNoDecimals = { ...mockToken, decimals: undefined } as any
        expect(formatBalance(new BN('1000'), tokenNoDecimals)).toBe('1,000 DOT')
      })

      it('should handle maxDecimals of 0', () => {
        const balance = new BN('10123456789') // 1.0123456789 DOT
        expect(formatBalance(balance, mockToken, 0)).toBe('1 DOT')
      })

      it('should handle negative maxDecimals', () => {
        const balance = new BN('10123456789')
        // Negative maxDecimals gets the full string with trailing zeros removed
        expect(formatBalance(balance, mockToken, -1)).toBe('1.012345678 DOT')
      })

      it('should handle very large decimals value', () => {
        const largeDecimalToken = { ...mockToken, decimals: 18 }
        const balance = new BN('1000000000000000000') // 1 token with 18 decimals
        expect(formatBalance(balance, largeDecimalToken)).toBe('1 DOT')
      })
    })
  })

  describe('convertToRawUnits', () => {
    const mockToken: Token = {
      symbol: 'DOT',
      decimals: 10,
      category: 'substrate',
      name: 'Polkadot',
      chainName: 'Polkadot',
    }

    it('should convert whole numbers correctly', () => {
      expect(convertToRawUnits(1, mockToken)).toBe(10000000000)
      expect(convertToRawUnits(100, mockToken)).toBe(1000000000000)
    })

    it('should convert fractional amounts correctly', () => {
      expect(convertToRawUnits(1.5, mockToken)).toBe(15000000000)
      expect(convertToRawUnits(0.1, mockToken)).toBe(1000000000)
    })

    it('should handle very small amounts', () => {
      expect(convertToRawUnits(0.0000000001, mockToken)).toBe(1)
    })

    it('should round to nearest integer', () => {
      expect(convertToRawUnits(1.23456789012, mockToken)).toBe(12345678901)
    })

    it('should handle zero', () => {
      expect(convertToRawUnits(0, mockToken)).toBe(0)
    })

    it('should handle negative amounts', () => {
      expect(convertToRawUnits(-1, mockToken)).toBe(-10000000000)
    })

    it('should handle token with no decimals', () => {
      const noDecimalToken = { ...mockToken, decimals: 0 }
      expect(convertToRawUnits(100, noDecimalToken)).toBe(100)
    })

    it('should handle token with undefined decimals', () => {
      const undefinedDecimalToken = { ...mockToken, decimals: undefined } as any
      expect(convertToRawUnits(100, undefinedDecimalToken)).toBe(100)
    })

    it('should handle null/undefined token', () => {
      expect(convertToRawUnits(100, null as any)).toBe(100)
      expect(convertToRawUnits(100, undefined as any)).toBe(100)
    })

    it('should handle different decimal places', () => {
      const token6Decimals = { ...mockToken, decimals: 6 }
      const token18Decimals = { ...mockToken, decimals: 18 }

      expect(convertToRawUnits(1, token6Decimals)).toBe(1000000)
      expect(convertToRawUnits(1, token18Decimals)).toBe(1000000000000000000)
    })

    it('should handle scientific notation', () => {
      expect(convertToRawUnits(1e-5, mockToken)).toBe(100000)
      expect(convertToRawUnits(1e5, mockToken)).toBe(1000000000000000)
    })
  })

  describe('formatVersion', () => {
    it('should format version object correctly', () => {
      const version: ResponseVersion = { major: 1, minor: 2, patch: 3 }
      expect(formatVersion(version)).toBe('1.2.3')
    })

    it('should handle zero version', () => {
      const version: ResponseVersion = { major: 0, minor: 0, patch: 0 }
      expect(formatVersion(version)).toBe('0.0.0')
    })

    it('should handle large version numbers', () => {
      const version: ResponseVersion = { major: 100, minor: 255, patch: 999 }
      expect(formatVersion(version)).toBe('100.255.999')
    })

    it('should handle single digit versions', () => {
      const version: ResponseVersion = { major: 1, minor: 0, patch: 0 }
      expect(formatVersion(version)).toBe('1.0.0')
    })

    it('should handle double digit versions', () => {
      const version: ResponseVersion = { major: 10, minor: 20, patch: 30 }
      expect(formatVersion(version)).toBe('10.20.30')
    })
  })
})
