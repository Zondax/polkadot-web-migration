import { describe, expect, it } from 'vitest'

import type { Token } from '@/config/apps'

import { BN } from '@polkadot/util'
import { convertToRawUnits, formatBalance, formatVersion, truncateMiddleOfString } from '../../utils/format'

describe('truncateMiddleOfString', () => {
  it('should return null for empty string', () => {
    expect(truncateMiddleOfString('', 10)).toBeNull()
  })

  it('should return the original string if it is shorter than maxLength', () => {
    expect(truncateMiddleOfString('short', 10)).toBe('short')
  })

  it('should truncate the middle of a long string', () => {
    expect(truncateMiddleOfString('1234567890', 6)).toBe('123...890')
  })

  it('should handle odd maxLength', () => {
    expect(truncateMiddleOfString('1234567890', 5)).toBe('12...90')
  })

  it('should handle maxLength equal to string length', () => {
    expect(truncateMiddleOfString('1234567890', 10)).toBe('1234567890')
  })

  it('should handle maxLength less than 5', () => {
    expect(truncateMiddleOfString('1234567890', 4)).toBe('12...90')
  })

  it('should handle maxLength of 3', () => {
    expect(truncateMiddleOfString('1234567890', 3)).toBe('1...0')
  })

  it('should return first character with ellipsis for maxLength of 2', () => {
    expect(truncateMiddleOfString('1234567890', 2)).toBe('1...0')
  })
})

describe('formatBalance', () => {
  const token = { symbol: 'DOT', decimals: 8 } as Token
  it('should format zero balance', () => {
    expect(formatBalance(new BN(0), token)).toBe('0 DOT')
  })

  it('should format balance without tokenDecimals', () => {
    expect(formatBalance(new BN(1000), { ...token, decimals: 0 })).toBe('1,000 DOT')
  })

  it('should format balance with tokenDecimals', () => {
    expect(formatBalance(new BN(123456789), token)).toBe('1.23456789 DOT')
  })

  it('should handle large numbers', () => {
    expect(formatBalance(new BN(1000000000), { ...token, decimals: 0 })).toBe('1,000,000,000 DOT')
  })

  it('should handle negative numbers', () => {
    expect(formatBalance(new BN(-1000), { ...token, decimals: 0 })).toBe('-1,000 DOT')
  })

  it('should handle very small decimal values', () => {
    expect(formatBalance(new BN(1), token, 8)).toBe('0.00000001 DOT')
  })

  it('should handle custom decimal places', () => {
    expect(formatBalance(new BN(123456), { ...token, decimals: 4 })).toBe('12.3456 DOT')
  })

  it('should handle undefined token', () => {
    expect(formatBalance(new BN(1000))).toBe('1,000')
  })

  it('should round to specified decimal places', () => {
    expect(formatBalance(new BN(123456789), token, 2)).toBe('1.23 DOT')
  })
})

describe('convertToRawUnits', () => {
  const token = { symbol: 'DOT', decimals: 8 } as Token

  it('should convert amount to raw units based on token decimals', () => {
    expect(convertToRawUnits(1.23456789, token)).toBe(123456789)
  })

  it('should handle zero amount', () => {
    expect(convertToRawUnits(0, token)).toBe(0)
  })

  it('should handle token with zero decimals', () => {
    expect(convertToRawUnits(1000, { ...token, decimals: 0 })).toBe(1000)
  })

  it('should handle token with undefined decimals', () => {
    expect(convertToRawUnits(1000, { symbol: 'DOT' } as Token)).toBe(1000)
  })

  it('should handle very small amounts', () => {
    expect(convertToRawUnits(0.00000001, token)).toBe(1)
  })
})

describe('formatVersion', () => {
  it('should format major, minor, and patch version correctly', () => {
    expect(formatVersion({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3')
  })

  it('should handle zero values correctly', () => {
    expect(formatVersion({ major: 0, minor: 0, patch: 0 })).toBe('0.0.0')
  })

  it('should handle single-digit version numbers', () => {
    expect(formatVersion({ major: 1, minor: 0, patch: 0 })).toBe('1.0.0')
  })

  it('should handle double-digit version numbers', () => {
    expect(formatVersion({ major: 10, minor: 11, patch: 12 })).toBe('10.11.12')
  })

  it('should work with mixtures of single and double digit version numbers', () => {
    expect(formatVersion({ major: 2, minor: 10, patch: 3 })).toBe('2.10.3')
  })
})
