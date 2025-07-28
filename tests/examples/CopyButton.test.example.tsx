/**
 * Example of a migrated test file using the new fixtures structure
 * This shows how to migrate the CopyButton test to use centralized test utilities
 */

import { act, fireEvent, render, screen } from '@testing-library/react'
import type { MockedFunction } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyButton } from '@/components/CopyButton'
// Import from centralized fixtures
import { TEST_ADDRESSES } from '@/tests/fixtures/addresses'
import { waitForAsync } from '@/tests/utils/testHelpers'

// Mock the copyContent utility
vi.mock('@/lib/utils', () => ({
  copyContent: vi.fn(),
}))

import { copyContent } from '@/lib/utils'

const mockCopyContent = copyContent as MockedFunction<typeof copyContent>

// Use centralized mock setup for common components
import { cleanupMocks, setupCommonMocks } from '@/tests/utils/mockSetup'

// Mock specific to this test
vi.mock('lucide-react', () => ({
  Check: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'check-icon', children: '✓' } })),
  Copy: vi.fn(() => ({ type: 'div', props: { 'data-testid': 'copy-icon', children: '📋' } })),
}))

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick, ...props }: any) => ({
    type: 'button',
    props: {
      onClick,
      ...props,
      'data-testid': 'copy-button',
      children,
    },
  })),
}))

describe('CopyButton component', () => {
  beforeEach(() => {
    setupCommonMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    cleanupMocks()
  })

  describe('basic rendering', () => {
    it('should render with copy icon initially', () => {
      render(<CopyButton value="test content" />)

      expect(screen.getByTestId('copy-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument()
    })

    it('should render button with correct props', () => {
      render(<CopyButton value="test content" size="lg" />)

      const button = screen.getByTestId('copy-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  describe('copy functionality with real addresses', () => {
    it('should copy address when clicked', async () => {
      // Use real test address from fixtures
      const testAddress = TEST_ADDRESSES.ALICE
      render(<CopyButton value={testAddress} />)

      const button = screen.getByTestId('copy-button')

      await act(async () => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith(testAddress)
      expect(mockCopyContent).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple addresses', async () => {
      const addresses = [TEST_ADDRESSES.ADDRESS1, TEST_ADDRESSES.ADDRESS2, TEST_ADDRESSES.ADDRESS3]

      for (const address of addresses) {
        const { unmount } = render(<CopyButton value={address} />)

        const button = screen.getByTestId('copy-button')
        await act(async () => {
          fireEvent.click(button)
        })

        expect(mockCopyContent).toHaveBeenLastCalledWith(address)

        unmount()
      }

      expect(mockCopyContent).toHaveBeenCalledTimes(addresses.length)
    })
  })

  describe('UI state transitions', () => {
    it('should show check icon after copying', async () => {
      render(<CopyButton value={TEST_ADDRESSES.ALICE} />)

      const button = screen.getByTestId('copy-button')

      await act(async () => {
        fireEvent.click(button)
      })

      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument()
    })

    it('should revert to copy icon after timeout', async () => {
      render(<CopyButton value={TEST_ADDRESSES.ALICE} />)

      const button = screen.getByTestId('copy-button')

      await act(async () => {
        fireEvent.click(button)
      })

      // Should show check icon immediately
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()

      // Fast-forward 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000)
      })

      // Should revert to copy icon
      expect(screen.getByTestId('copy-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', async () => {
      render(<CopyButton value="" />)

      const button = screen.getByTestId('copy-button')

      await waitForAsync(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith('')
    })

    it('should handle special characters in addresses', async () => {
      // Some chains might have different address formats
      const specialAddress = TEST_ADDRESSES.KUSAMA_ASSET_HUB_WITH_UNIQUES
      render(<CopyButton value={specialAddress} />)

      const button = screen.getByTestId('copy-button')

      await waitForAsync(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith(specialAddress)
    })
  })

  describe('rapid interactions', () => {
    it('should handle multiple rapid clicks', async () => {
      render(<CopyButton value={TEST_ADDRESSES.ALICE} />)

      const button = screen.getByTestId('copy-button')

      // Click multiple times rapidly
      await act(async () => {
        fireEvent.click(button)
        fireEvent.click(button)
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledTimes(3)
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
    })
  })
})
