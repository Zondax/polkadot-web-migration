// Core scan types for index scanning functionality
export type ScanType = 'single' | 'range'
export type RangeField = 'start' | 'end'

// Index field types for better type safety
export type IndexField = 'account' | 'address'

// Enum alternatives (provide runtime values if needed)
export enum ScanTypeEnum {
  SINGLE = 'single',
  RANGE = 'range',
}

export enum RangeFieldEnum {
  START = 'start',
  END = 'end',
}

// Index configuration interfaces
export interface SingleIndexConfig {
  type: 'single'
  value: number
}

export interface RangeIndexConfig {
  type: 'range'
  start: number
  end: number
}

export type IndexConfig = SingleIndexConfig | RangeIndexConfig

// State shape for index inputs
export interface IndexInputState {
  scanType: ScanType
  single: string
  range: {
    start: string
    end: string
  }
}

// Validation result
export interface ValidationResult {
  isValid: boolean
  error?: string
}

// Constants for scan limits
export const SCAN_LIMITS = {
  MIN_INDEX: 0 as number,
  MAX_RANGE: 50 as number,
  DEFAULT_SINGLE: 0 as number,
  DEFAULT_RANGE_START: 0 as number,
  DEFAULT_RANGE_END: 5 as number,
}
