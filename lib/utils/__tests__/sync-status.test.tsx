import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FetchingAddressesPhase, type SyncProgress } from '@/state/types/ledger'
import { getSyncStatusLabel } from '../sync-status'

describe('getSyncStatusLabel', () => {
  describe('FETCHING_ADDRESSES phase', () => {
    it('should display fetching addresses label without progress', () => {
      const progress: SyncProgress = {
        scanned: 0,
        total: 0,
        percentage: 0,
        phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('📥 Fetching addresses from Ledger')
    })

    it('should display fetching addresses label with progress counter', () => {
      const progress: SyncProgress = {
        scanned: 3,
        total: 10,
        percentage: 30,
        phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('📥 Fetching addresses from Ledger (3 / 10)')
    })

    it('should display fetching addresses label with completed progress', () => {
      const progress: SyncProgress = {
        scanned: 10,
        total: 10,
        percentage: 100,
        phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('📥 Fetching addresses from Ledger (10 / 10)')
    })
  })

  describe('PROCESSING_ACCOUNTS phase', () => {
    it('should display processing accounts label without progress', () => {
      const progress: SyncProgress = {
        scanned: 0,
        total: 0,
        percentage: 0,
        phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('💾 Processing accounts (balances, multisig and more)')
    })

    it('should display processing accounts label with progress counter', () => {
      const progress: SyncProgress = {
        scanned: 5,
        total: 8,
        percentage: 62.5,
        phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('💾 Processing accounts (balances, multisig and more) (5 / 8)')
    })

    it('should display processing accounts label at start', () => {
      const progress: SyncProgress = {
        scanned: 0,
        total: 5,
        percentage: 0,
        phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('💾 Processing accounts (balances, multisig and more) (0 / 5)')
    })
  })

  describe('Default label handling', () => {
    it('should use default label when phase is undefined', () => {
      const progress: SyncProgress = {
        scanned: 2,
        total: 5,
        percentage: 40,
        phase: undefined,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('Synchronizing apps (2 / 5)')
    })

    it('should use custom default label when provided', () => {
      const progress: SyncProgress = {
        scanned: 3,
        total: 7,
        percentage: 42.8,
        phase: undefined,
      }

      const { container } = render(getSyncStatusLabel(progress, 'Deep scanning'))
      expect(container.textContent).toBe('Deep scanning (3 / 7)')
    })

    it('should use custom default label without progress', () => {
      const progress: SyncProgress = {
        scanned: 0,
        total: 0,
        percentage: 0,
        phase: undefined,
      }

      const { container } = render(getSyncStatusLabel(progress, 'Custom operation'))
      expect(container.textContent).toBe('Custom operation')
    })
  })

  describe('Edge cases', () => {
    it('should handle undefined progress', () => {
      const { container } = render(getSyncStatusLabel(undefined))
      expect(container.textContent).toBe('Synchronizing apps')
    })

    it('should handle undefined progress with custom default label', () => {
      const { container } = render(getSyncStatusLabel(undefined, 'Loading data'))
      expect(container.textContent).toBe('Loading data')
    })

    it('should handle progress with only total set', () => {
      const progress: SyncProgress = {
        scanned: 0,
        total: 10,
        percentage: 0,
        phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('📥 Fetching addresses from Ledger (0 / 10)')
    })

    it('should handle progress with large numbers', () => {
      const progress: SyncProgress = {
        scanned: 1234,
        total: 5678,
        percentage: 21.7,
        phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('💾 Processing accounts (balances, multisig and more) (1234 / 5678)')
    })

    it('should not show progress counter when total is 0', () => {
      const progress: SyncProgress = {
        scanned: 0,
        total: 0,
        percentage: 0,
        phase: FetchingAddressesPhase.PROCESSING_ACCOUNTS,
      }

      const { container } = render(getSyncStatusLabel(progress))
      expect(container.textContent).toBe('💾 Processing accounts (balances, multisig and more)')
      expect(container.textContent).not.toContain('(0 / 0)')
    })
  })

  describe('Rendering and styling', () => {
    it('should render with correct CSS class', () => {
      const progress: SyncProgress = {
        scanned: 1,
        total: 5,
        percentage: 20,
        phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
      }

      const { container } = render(getSyncStatusLabel(progress))
      const span = container.querySelector('span')
      expect(span).toHaveClass('text-sm', 'text-gray-600')
    })

    it('should return a valid JSX element', () => {
      const progress: SyncProgress = {
        scanned: 1,
        total: 5,
        percentage: 20,
        phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
      }

      const result = getSyncStatusLabel(progress)
      expect(result).toBeDefined()
      expect(result.type).toBe('span')
    })
  })

  describe('Progress counter formatting', () => {
    it('should format progress counter correctly with different numbers', () => {
      const testCases = [
        { scanned: 1, total: 1, expected: '(1 / 1)' },
        { scanned: 0, total: 100, expected: '(0 / 100)' },
        { scanned: 50, total: 100, expected: '(50 / 100)' },
        { scanned: 99, total: 100, expected: '(99 / 100)' },
      ]

      for (const { scanned, total, expected } of testCases) {
        const progress: SyncProgress = {
          scanned,
          total,
          percentage: (scanned / total) * 100,
          phase: FetchingAddressesPhase.FETCHING_ADDRESSES,
        }

        const { container } = render(getSyncStatusLabel(progress))
        expect(container.textContent).toContain(expected)
      }
    })
  })
})
