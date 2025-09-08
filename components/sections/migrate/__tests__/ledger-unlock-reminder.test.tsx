import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LedgerUnlockReminder } from '../ledger-unlock-reminder'

// Mock timers for testing
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('LedgerUnlockReminder', () => {
  it('should not show reminder when not visible', () => {
    render(<LedgerUnlockReminder isVisible={false} />)

    // Should not render anything when not visible
    expect(screen.queryByText(/Keep your Ledger device unlocked/)).not.toBeInTheDocument()
  })

  it('should show reminder after timeout when visible', async () => {
    render(<LedgerUnlockReminder isVisible={true} />)

    // Initially should not be visible
    expect(screen.queryByText('Keep your Ledger device unlocked')).not.toBeInTheDocument()

    // Fast-forward to just before the reminder should appear
    act(() => {
      vi.advanceTimersByTime(49000) // 49 seconds
    })
    expect(screen.queryByText('Keep your Ledger device unlocked')).not.toBeInTheDocument()

    // Fast-forward to when reminder should appear (50 seconds)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText('Keep your Ledger device unlocked')).toBeInTheDocument()
  })

  it('should keep reminder visible after it appears', async () => {
    render(<LedgerUnlockReminder isVisible={true} />)

    // Initially should not be visible
    expect(screen.queryByText('Keep your Ledger device unlocked')).not.toBeInTheDocument()

    // Fast-forward to when reminder appears (50 seconds)
    act(() => {
      vi.advanceTimersByTime(50000)
    })
    expect(screen.getByText('Keep your Ledger device unlocked')).toBeInTheDocument()

    // Fast-forward by 10 seconds (old behavior would hide it here)
    act(() => {
      vi.advanceTimersByTime(10000)
    })
    expect(screen.getByText('Keep your Ledger device unlocked')).toBeInTheDocument()

    // Fast-forward by much longer time - should still be visible
    act(() => {
      vi.advanceTimersByTime(120000) // 2 more minutes
    })
    expect(screen.getByText('Keep your Ledger device unlocked')).toBeInTheDocument()
  })

  it('should clear timers when visibility changes to false', async () => {
    const { rerender } = render(<LedgerUnlockReminder isVisible={true} />)

    // Fast-forward to when reminder should appear
    act(() => {
      vi.advanceTimersByTime(50000)
    })
    expect(screen.getByText('Keep your Ledger device unlocked')).toBeInTheDocument()

    // Change visibility to false
    rerender(<LedgerUnlockReminder isVisible={false} />)
    expect(screen.queryByText('Keep your Ledger device unlocked')).not.toBeInTheDocument()

    // Fast-forward more time - reminder should not appear again
    act(() => {
      vi.advanceTimersByTime(100000)
    })
    expect(screen.queryByText('Keep your Ledger device unlocked')).not.toBeInTheDocument()
  })

  it('should have correct styling and content', async () => {
    render(<LedgerUnlockReminder isVisible={true} />)

    // Fast-forward to show the reminder
    act(() => {
      vi.advanceTimersByTime(50000)
    })

    const reminder = screen.getByText('Keep your Ledger device unlocked')
    expect(reminder).toBeInTheDocument()

    // Check for the alert container with correct styling classes
    const alertContainer = reminder.closest('[role="alert"]')
    expect(alertContainer).toHaveClass('border-amber-200', 'bg-amber-50')

    // Check for the warning text content
    expect(screen.getByText(/The synchronization process is still running/)).toBeInTheDocument()
    expect(screen.getByText(/Please ensure your device stays active/)).toBeInTheDocument()
  })

  it('should clean up timers on unmount', async () => {
    const { unmount } = render(<LedgerUnlockReminder isVisible={true} />)

    // Start timers
    act(() => {
      vi.advanceTimersByTime(25000) // Partway through
    })

    // Unmount component
    unmount()

    // Advance time past when reminder should appear
    act(() => {
      vi.advanceTimersByTime(50000)
    })

    // Should not throw any errors or have memory leaks
    expect(() => vi.runAllTimers()).not.toThrow()
  })
})
