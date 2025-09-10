import type { IndexConfig, RangeField, RangeIndexConfig, ScanType, SingleIndexConfig, ValidationResult } from '@/lib/types/scan'
import { RangeFieldEnum, SCAN_LIMITS, ScanTypeEnum } from '@/lib/types/scan'

/**
 * Type guard to check if scan type is 'single'
 */
export function isSingleScan(scanType: ScanType): scanType is 'single' {
  return scanType === ScanTypeEnum.SINGLE
}

/**
 * Type guard to check if scan type is 'range'
 */
export function isRangeScan(scanType: ScanType): scanType is 'range' {
  return scanType === ScanTypeEnum.RANGE
}

/**
 * Type guard to check if config is single index config
 */
export function isSingleConfig(config: IndexConfig): config is SingleIndexConfig {
  return config.type === ScanTypeEnum.SINGLE
}

/**
 * Type guard to check if config is range index config
 */
export function isRangeConfig(config: IndexConfig): config is RangeIndexConfig {
  return config.type === ScanTypeEnum.RANGE
}

/**
 * Parse and validate index configuration
 */
export function parseIndexConfig(scanType: ScanType, singleValue: string, rangeStart: string, rangeEnd: string): IndexConfig | null {
  if (isSingleScan(scanType)) {
    const value = Number.parseInt(singleValue, 10)
    if (Number.isNaN(value) || value < SCAN_LIMITS.MIN_INDEX) return null
    return { type: ScanTypeEnum.SINGLE, value }
  }

  const start = Number.parseInt(rangeStart, 10)
  const end = Number.parseInt(rangeEnd, 10)
  if (Number.isNaN(start) || Number.isNaN(end) || start < SCAN_LIMITS.MIN_INDEX || end < start) return null

  return { type: ScanTypeEnum.RANGE, start, end }
}

/**
 * Validate index configuration with detailed error messages
 */
export function validateIndexConfig(scanType: ScanType, singleValue: string, rangeStart: string, rangeEnd: string): ValidationResult {
  if (isSingleScan(scanType)) {
    const value = Number.parseInt(singleValue, 10)
    if (Number.isNaN(value)) {
      return { isValid: false, error: 'Index must be a number' }
    }
    if (value < SCAN_LIMITS.MIN_INDEX) {
      return { isValid: false, error: `Index must be at least ${SCAN_LIMITS.MIN_INDEX}` }
    }
    return { isValid: true }
  }

  const start = Number.parseInt(rangeStart, 10)
  const end = Number.parseInt(rangeEnd, 10)

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return { isValid: false, error: 'Range values must be numbers' }
  }
  if (start < SCAN_LIMITS.MIN_INDEX) {
    return { isValid: false, error: `Start index must be at least ${SCAN_LIMITS.MIN_INDEX}` }
  }
  if (end < start) {
    return { isValid: false, error: 'End index must be greater than or equal to start' }
  }
  if (end - start >= SCAN_LIMITS.MAX_RANGE) {
    return { isValid: false, error: `Range cannot exceed ${SCAN_LIMITS.MAX_RANGE} indices` }
  }

  return { isValid: true }
}

/**
 * Get count of indices based on scan type and values
 */
export function getIndexCount(scanType: ScanType, rangeStart: string, rangeEnd: string): number {
  if (isSingleScan(scanType)) {
    return 1
  }

  const start = Number.parseInt(rangeStart, 10) || 0
  const end = Number.parseInt(rangeEnd, 10) || 0
  return Math.max(0, end - start + 1)
}

/**
 * Get count from IndexConfig
 */
export function getIndexCountFromConfig(config: IndexConfig): number {
  if (isSingleConfig(config)) return 1
  return config.end - config.start + 1
}

/**
 * Format index for display in UI
 */
export function formatIndexDisplay(scanType: ScanType, singleValue: string, rangeStart: string, rangeEnd: string): string {
  if (isSingleScan(scanType)) {
    const value = Number.parseInt(singleValue, 10) || 0
    return `${value}`
  }

  const start = Number.parseInt(rangeStart, 10) || 0
  const end = Number.parseInt(rangeEnd, 10) || 0
  if (start === end) return `${start}`
  return `{${start}...${end}}`
}

/**
 * Format IndexConfig for display
 */
export function formatIndexDisplayFromConfig(config: IndexConfig): string {
  if (isSingleConfig(config)) return `${config.value}`
  if (config.start === config.end) return `${config.start}`
  return `{${config.start}...${config.end}}`
}

/**
 * Adjust index value with bounds checking
 */
export function adjustIndexValue(currentValue: string, increment: number, min = SCAN_LIMITS.MIN_INDEX): string {
  const current = Number.parseInt(currentValue, 10) || 0
  const newValue = Math.max(min, current + increment)
  return newValue.toString()
}

/**
 * Get range field value
 */
export function getRangeValue(range: { start: string; end: string }, field: RangeField): string {
  return field === RangeFieldEnum.START ? range.start : range.end
}

/**
 * Update range field value
 */
export function updateRangeValue(range: { start: string; end: string }, field: RangeField, value: string): { start: string; end: string } {
  return field === RangeFieldEnum.START ? { ...range, start: value } : { ...range, end: value }
}

/**
 * Check if a range exceeds the recommended limit
 */
export function isRangeExceedsLimit(rangeStart: string, rangeEnd: string, limit = SCAN_LIMITS.MAX_RANGE): boolean {
  const start = Number.parseInt(rangeStart, 10) || 0
  const end = Number.parseInt(rangeEnd, 10) || 0
  return end - start >= limit
}

/**
 * Get plural form for count display
 */
export function getPluralForm(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular
  return plural || `${singular}s`
}

/**
 * Generate an array of indices based on scan configuration
 */
export function generateIndicesArray(scanType: ScanType, singleValue?: number, rangeStart?: number, rangeEnd?: number): number[] {
  if (isSingleScan(scanType) && singleValue !== undefined) {
    return [singleValue]
  }

  if (isRangeScan(scanType) && rangeStart !== undefined && rangeEnd !== undefined) {
    const indices: number[] = []
    for (let i = rangeStart; i <= rangeEnd; i++) {
      indices.push(i)
    }
    return indices
  }

  return []
}
