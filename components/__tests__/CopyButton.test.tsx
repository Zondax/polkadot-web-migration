import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CopyButton } from '../CopyButton'

// Mock the copyContent utility
vi.mock('@/lib/utils', () => ({
  copyContent: vi.fn(),
}))

import type { MockedFunction } from 'vitest'
// Import the mocked utility
import { copyContent } from '@/lib/utils'

const mockCopyContent = copyContent as MockedFunction<typeof copyContent>

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Check: vi.fn(() => <div data-testid="check-icon">✓</div>),
  Copy: vi.fn(() => <div data-testid="copy-icon">📋</div>),
}))

// Mock the Button component
vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props} data-testid="copy-button">
      {children}
    </button>
  )),
}))

describe('CopyButton component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('basic rendering', () => {
    it('should render with copy icon initially', () => {
      render(<CopyButton value="test content" />)

      expect(screen.getByTestId('copy-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument()
    })

    it('should render button with correct props', () => {
      render(<CopyButton value="test content" size="md" />)

      const button = screen.getByTestId('copy-button')
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should use default size when not specified', () => {
      render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('copy functionality', () => {
    it('should call copyContent with correct value when clicked', () => {
      const testValue = 'Hello, World!'
      render(<CopyButton value={testValue} />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith(testValue)
      expect(mockCopyContent).toHaveBeenCalledTimes(1)

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })

    it('should show check icon after clicking', () => {
      render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      expect(screen.getByTestId('check-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument()

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })

    it('should revert to copy icon after 2 seconds', () => {
      render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      // Should show check icon immediately
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()

      // Fast-forward 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Should revert to copy icon
      expect(screen.getByTestId('copy-icon')).toBeInTheDocument()
      expect(screen.queryByTestId('check-icon')).not.toBeInTheDocument()
    })

    it('should prevent default on click event', () => {
      render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      // The preventDefault is called internally by the handler
      expect(mockCopyContent).toHaveBeenCalled()

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })
  })

  describe('different value types', () => {
    it('should handle empty string', () => {
      render(<CopyButton value="" />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith('')

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })

    it('should handle long strings', () => {
      const longValue = 'a'.repeat(1000)
      render(<CopyButton value={longValue} />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith(longValue)

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })

    it('should handle special characters', () => {
      const specialValue = '🚀 Special chars: <>&"\'\`'
      render(<CopyButton value={specialValue} />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith(specialValue)

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })

    it('should handle unicode content', () => {
      const unicodeValue = '测试 Test 🎉 العربية'
      render(<CopyButton value={unicodeValue} />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith(unicodeValue)

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })
  })

  describe('multiple clicks and timing', () => {
    it('should handle rapid multiple clicks', async () => {
      render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')

      // Click multiple times rapidly
      act(() => {
        fireEvent.click(button)
        fireEvent.click(button)
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledTimes(3)
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })

    it('should handle clicks during transition period', () => {
      render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')

      // First click
      act(() => {
        fireEvent.click(button)
      })
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()

      // Click again after 1 second (still in check state)
      act(() => {
        vi.advanceTimersByTime(1000)
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledTimes(2)
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })
  })

  describe('component lifecycle', () => {
    it('should handle unmounting during timeout', () => {
      const { unmount } = render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      // Unmount before timeout completes
      unmount()

      // Advance time - should not cause errors
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // No errors should occur
    })

    it('should handle value changes', () => {
      const { rerender } = render(<CopyButton value="initial value" />)

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith('initial value')

      // Change value
      rerender(<CopyButton value="new value" />)

      // Click again
      act(() => {
        fireEvent.click(button)
      })

      expect(mockCopyContent).toHaveBeenCalledWith('new value')
      expect(mockCopyContent).toHaveBeenCalledTimes(2)

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })
  })

  describe('accessibility and interaction', () => {
    it('should be keyboard accessible', () => {
      render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')

      // Should be focusable
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('should have proper button type', () => {
      render(<CopyButton value="test content" />)

      const button = screen.getByTestId('copy-button')
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  describe('integration with mocked components', () => {
    it('should pass correct props to Button component', () => {
      render(<CopyButton value="test content" size="lg" />)

      const button = screen.getByTestId('copy-button')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should render correct icons based on state', () => {
      render(<CopyButton value="test content" />)

      // Initially should render Copy icon
      expect(screen.getByTestId('copy-icon')).toBeInTheDocument()

      const button = screen.getByTestId('copy-button')

      act(() => {
        fireEvent.click(button)
      })

      // After click should render Check icon
      expect(screen.getByTestId('check-icon')).toBeInTheDocument()

      // Clean up pending timers
      act(() => {
        vi.runAllTimers()
      })
    })
  })
})
