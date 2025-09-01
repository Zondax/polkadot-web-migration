import { describe, expect, it } from 'vitest'
// Remove unused imports - keeping for completeness of type testing
import { SCAN_LIMITS } from '@/lib/types/scan'
import {
  adjustIndexValue,
  formatIndexDisplay,
  formatIndexDisplayFromConfig,
  generateIndicesArray,
  getIndexCount,
  getIndexCountFromConfig,
  getPluralForm,
  getRangeValue,
  isRangeConfig,
  isRangeExceedsLimit,
  isRangeScan,
  isSingleConfig,
  isSingleScan,
  parseIndexConfig,
  updateRangeValue,
  validateIndexConfig,
} from '../scan-indices'

describe('scan-indices utilities', () => {
  describe('Type guards', () => {
    describe('isSingleScan', () => {
      it('should return true for single scan type', () => {
        expect(isSingleScan('single')).toBe(true)
      })

      it('should return false for range scan type', () => {
        expect(isSingleScan('range')).toBe(false)
      })
    })

    describe('isRangeScan', () => {
      it('should return true for range scan type', () => {
        expect(isRangeScan('range')).toBe(true)
      })

      it('should return false for single scan type', () => {
        expect(isRangeScan('single')).toBe(false)
      })
    })

    describe('Config type guards', () => {
      it('should identify single config correctly', () => {
        const singleConfig = { type: 'single' as const, value: 5 }
        const rangeConfig = { type: 'range' as const, start: 1, end: 5 }

        expect(isSingleConfig(singleConfig)).toBe(true)
        expect(isSingleConfig(rangeConfig)).toBe(false)
      })

      it('should identify range config correctly', () => {
        const singleConfig = { type: 'single' as const, value: 5 }
        const rangeConfig = { type: 'range' as const, start: 1, end: 5 }

        expect(isRangeConfig(rangeConfig)).toBe(true)
        expect(isRangeConfig(singleConfig)).toBe(false)
      })
    })
  })

  describe('parseIndexConfig', () => {
    describe('Single scan type', () => {
      it('should parse valid single index', () => {
        const config = parseIndexConfig('single', '5', '0', '10')
        expect(config).toEqual({ type: 'single', value: 5 })
      })

      it('should parse zero index', () => {
        const config = parseIndexConfig('single', '0', '1', '5')
        expect(config).toEqual({ type: 'single', value: 0 })
      })

      it('should return null for invalid single index', () => {
        expect(parseIndexConfig('single', 'invalid', '0', '10')).toBeNull()
        expect(parseIndexConfig('single', '-1', '0', '10')).toBeNull()
        expect(parseIndexConfig('single', '', '0', '10')).toBeNull()
      })
    })

    describe('Range scan type', () => {
      it('should parse valid range', () => {
        const config = parseIndexConfig('range', '0', '1', '5')
        expect(config).toEqual({ type: 'range', start: 1, end: 5 })
      })

      it('should parse single-value range', () => {
        const config = parseIndexConfig('range', '0', '3', '3')
        expect(config).toEqual({ type: 'range', start: 3, end: 3 })
      })

      it('should return null for invalid range values', () => {
        expect(parseIndexConfig('range', '0', 'invalid', '5')).toBeNull()
        expect(parseIndexConfig('range', '0', '1', 'invalid')).toBeNull()
        expect(parseIndexConfig('range', '0', '5', '1')).toBeNull() // end < start
        expect(parseIndexConfig('range', '0', '-1', '5')).toBeNull() // negative start
      })
    })
  })

  describe('validateIndexConfig', () => {
    describe('Single scan validation', () => {
      it('should validate valid single index', () => {
        const result = validateIndexConfig('single', '5', '0', '10')
        expect(result).toEqual({ isValid: true })
      })

      it('should validate zero index', () => {
        const result = validateIndexConfig('single', '0', '1', '5')
        expect(result).toEqual({ isValid: true })
      })

      it('should reject invalid single index', () => {
        const result = validateIndexConfig('single', 'invalid', '0', '10')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Index must be a number')
      })

      it('should reject negative single index', () => {
        const result = validateIndexConfig('single', '-1', '0', '10')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe(`Index must be at least ${SCAN_LIMITS.MIN_INDEX}`)
      })
    })

    describe('Range scan validation', () => {
      it('should validate valid range', () => {
        const result = validateIndexConfig('range', '0', '1', '5')
        expect(result).toEqual({ isValid: true })
      })

      it('should validate single-value range', () => {
        const result = validateIndexConfig('range', '0', '3', '3')
        expect(result).toEqual({ isValid: true })
      })

      it('should reject invalid range values', () => {
        let result = validateIndexConfig('range', '0', 'invalid', '5')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Range values must be numbers')

        result = validateIndexConfig('range', '0', '1', 'invalid')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Range values must be numbers')
      })

      it('should reject negative start index', () => {
        const result = validateIndexConfig('range', '0', '-1', '5')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe(`Start index must be at least ${SCAN_LIMITS.MIN_INDEX}`)
      })

      it('should reject end < start', () => {
        const result = validateIndexConfig('range', '0', '5', '1')
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('End index must be greater than or equal to start')
      })

      it('should reject range that exceeds limit', () => {
        const result = validateIndexConfig('range', '0', '0', SCAN_LIMITS.MAX_RANGE.toString())
        expect(result.isValid).toBe(false)
        expect(result.error).toBe(`Range cannot exceed ${SCAN_LIMITS.MAX_RANGE} indices`)
      })
    })
  })

  describe('getIndexCount', () => {
    it('should return 1 for single scan', () => {
      expect(getIndexCount('single', '5', '0')).toBe(1)
    })

    it('should calculate range count correctly', () => {
      expect(getIndexCount('range', '0', '1')).toBe(2) // 0,1
      expect(getIndexCount('range', '0', '0')).toBe(1) // just 0
      expect(getIndexCount('range', '0', '3')).toBe(4) // 0,1,2,3
      expect(getIndexCount('range', '0', '5')).toBe(6) // 0,1,2,3,4,5
    })

    it('should handle invalid values gracefully', () => {
      expect(getIndexCount('range', 'invalid', 'invalid')).toBe(1) // invalid values default to 0, so 0-0 = 1
      expect(getIndexCount('range', '0', 'invalid')).toBe(1) // invalid end defaults to 0, so 0-0 = 1
    })
  })

  describe('getIndexCountFromConfig', () => {
    it('should return 1 for single config', () => {
      const config = { type: 'single' as const, value: 5 }
      expect(getIndexCountFromConfig(config)).toBe(1)
    })

    it('should calculate range count from config', () => {
      const config = { type: 'range' as const, start: 1, end: 5 }
      expect(getIndexCountFromConfig(config)).toBe(5)
    })
  })

  describe('formatIndexDisplay', () => {
    it('should format single index', () => {
      expect(formatIndexDisplay('single', '5', '0', '10')).toBe('5')
      expect(formatIndexDisplay('single', '0', '1', '5')).toBe('0')
    })

    it('should format range display', () => {
      expect(formatIndexDisplay('range', '0', '1', '5')).toBe('{1...5}')
      expect(formatIndexDisplay('range', '0', '3', '3')).toBe('3') // same start/end
    })

    it('should handle invalid values', () => {
      expect(formatIndexDisplay('single', 'invalid', '0', '10')).toBe('0')
      expect(formatIndexDisplay('range', '0', 'invalid', '5')).toBe('{0...5}')
    })
  })

  describe('formatIndexDisplayFromConfig', () => {
    it('should format single config', () => {
      const config = { type: 'single' as const, value: 5 }
      expect(formatIndexDisplayFromConfig(config)).toBe('5')
    })

    it('should format range config', () => {
      const config = { type: 'range' as const, start: 1, end: 5 }
      expect(formatIndexDisplayFromConfig(config)).toBe('{1...5}')

      const sameConfig = { type: 'range' as const, start: 3, end: 3 }
      expect(formatIndexDisplayFromConfig(sameConfig)).toBe('3')
    })
  })

  describe('adjustIndexValue', () => {
    it('should adjust value correctly', () => {
      expect(adjustIndexValue('5', 1)).toBe('6')
      expect(adjustIndexValue('5', -2)).toBe('3')
      expect(adjustIndexValue('0', 5)).toBe('5')
    })

    it('should respect minimum bounds', () => {
      expect(adjustIndexValue('1', -5)).toBe('0') // default min is 0
      expect(adjustIndexValue('5', -10, 2)).toBe('2') // custom min
    })

    it('should handle invalid current values', () => {
      expect(adjustIndexValue('invalid', 5)).toBe('5') // treats invalid as 0
      expect(adjustIndexValue('', -1)).toBe('0') // treats empty as 0, respects min
    })
  })

  describe('getRangeValue', () => {
    const range = { start: '1', end: '5' }

    it('should get start value', () => {
      expect(getRangeValue(range, 'start')).toBe('1')
    })

    it('should get end value', () => {
      expect(getRangeValue(range, 'end')).toBe('5')
    })
  })

  describe('updateRangeValue', () => {
    const range = { start: '1', end: '5' }

    it('should update start value', () => {
      const updated = updateRangeValue(range, 'start', '2')
      expect(updated).toEqual({ start: '2', end: '5' })
    })

    it('should update end value', () => {
      const updated = updateRangeValue(range, 'end', '7')
      expect(updated).toEqual({ start: '1', end: '7' })
    })

    it('should not mutate original range', () => {
      updateRangeValue(range, 'start', '10')
      expect(range).toEqual({ start: '1', end: '5' })
    })
  })

  describe('isRangeExceedsLimit', () => {
    it('should detect when range exceeds default limit', () => {
      const limit = SCAN_LIMITS.MAX_RANGE
      expect(isRangeExceedsLimit('0', (limit - 1).toString())).toBe(false)
      expect(isRangeExceedsLimit('0', limit.toString())).toBe(true)
      expect(isRangeExceedsLimit('0', (limit + 1).toString())).toBe(true)
    })

    it('should use custom limit', () => {
      expect(isRangeExceedsLimit('0', '9', 10)).toBe(false)
      expect(isRangeExceedsLimit('0', '10', 10)).toBe(true)
    })

    it('should handle invalid values', () => {
      expect(isRangeExceedsLimit('invalid', '5')).toBe(false)
      expect(isRangeExceedsLimit('0', 'invalid')).toBe(false)
    })
  })

  describe('getPluralForm', () => {
    it('should return singular for count of 1', () => {
      expect(getPluralForm(1, 'account')).toBe('account')
      expect(getPluralForm(1, 'address', 'addresses')).toBe('address')
    })

    it('should return default plural for count != 1', () => {
      expect(getPluralForm(0, 'account')).toBe('accounts')
      expect(getPluralForm(2, 'account')).toBe('accounts')
      expect(getPluralForm(10, 'account')).toBe('accounts')
    })

    it('should use custom plural form', () => {
      expect(getPluralForm(2, 'address', 'addresses')).toBe('addresses')
      expect(getPluralForm(0, 'child', 'children')).toBe('children')
    })
  })

  describe('generateIndicesArray', () => {
    it('should generate single index array', () => {
      const result = generateIndicesArray('single', 5)
      expect(result).toEqual([5])
    })

    it('should generate range index array', () => {
      const result = generateIndicesArray('range', undefined, 1, 5)
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should generate single-value range', () => {
      const result = generateIndicesArray('range', undefined, 3, 3)
      expect(result).toEqual([3])
    })

    it('should return empty array for invalid inputs', () => {
      expect(generateIndicesArray('single')).toEqual([])
      expect(generateIndicesArray('range', undefined, 1)).toEqual([])
      expect(generateIndicesArray('range', undefined, undefined, 5)).toEqual([])
    })
  })
})
