import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Hoist mocks properly
const { mockToast, mockToastCustom, mockToastDismiss } = vi.hoisted(() => {
  const toast = vi.fn(() => 'toast-id-1')
  const custom = vi.fn()
  const dismiss = vi.fn()

  toast.custom = custom
  toast.dismiss = dismiss

  return {
    mockToast: toast,
    mockToastCustom: custom,
    mockToastDismiss: dismiss,
  }
})

vi.mock('sonner', () => ({
  toast: mockToast,
  Toaster: ({ position, theme }: any) => (
    <div data-testid="toaster" data-position={position} data-theme={theme}>
      Toaster
    </div>
  ),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props} data-testid="button">
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/sonner', () => ({
  Toaster: ({ position, theme }: any) => (
    <div data-testid="toaster" data-position={position} data-theme={theme}>
      Toaster
    </div>
  ),
}))

vi.mock('@/lib/utils/html', () => ({
  muifyHtml: (html: string) => {
    // For tests, we'll just display the HTML as text content
    // This avoids the dangerouslySetInnerHTML warning while still testing the component
    return <div data-testid="muified-html">{html}</div>
  },
}))

vi.mock('@legendapp/state/react', () => ({
  observer: (Component: any) => Component,
}))

import { notifications$ } from '@/state/notifications'
import type { Notification } from '@/state/types/notifications'
import { uiState$ } from '@/state/ui'
import Notifications from '../notifications'

describe('Notifications component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset observable state
    notifications$.active.set([])
    notifications$.history.set([])
    uiState$.icons.set({})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render the Toaster component', () => {
      render(<Notifications />)

      const toaster = screen.getByTestId('toaster')
      expect(toaster).toBeInTheDocument()
      expect(toaster).toHaveAttribute('data-position', 'bottom-right')
      expect(toaster).toHaveAttribute('data-theme', 'light')
    })

    it('should not show any toast when there are no notifications', () => {
      render(<Notifications />)

      expect(mockToast).not.toHaveBeenCalled()
      expect(mockToastCustom).not.toHaveBeenCalled()
    })
  })

  describe('notification display', () => {
    it('should show toast when a new notification is added', async () => {
      const notification: Notification = {
        id: '1',
        title: 'Test Notification',
        description: 'This is a test notification',
        type: 'info',
        createdAt: new Date(),
      }

      const { rerender } = render(<Notifications />)

      act(() => {
        notifications$.active.set([notification])
      })

      // Force re-render to trigger useEffect
      rerender(<Notifications />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Test Notification', {
          duration: 5000,
          dismissible: true,
          style: {
            display: 'flex',
            flexDirection: 'column',
          },
          classNames: {
            content: 'w-full',
            toast: 'bg-white/90 backdrop-blur-md border border-white/20 shadow-lg rounded-md p-4 w-sm min-w-sm max-w-sm',
          },
        })
        expect(mockToastCustom).toHaveBeenCalled()
      })
    })

    it('should show only the most recent notification', async () => {
      const { rerender } = render(<Notifications />)

      // Add first notification
      act(() => {
        notifications$.active.set([
          {
            id: '1',
            title: 'First Notification',
            description: 'First',
            type: 'info',
            createdAt: new Date(),
          },
        ])
      })
      rerender(<Notifications />)

      // Clear mocks
      vi.clearAllMocks()

      // Add second notification
      act(() => {
        notifications$.active.set([
          {
            id: '1',
            title: 'First Notification',
            description: 'First',
            type: 'info',
            createdAt: new Date(),
          },
          {
            id: '2',
            title: 'Second Notification',
            description: 'Second',
            type: 'success',
            createdAt: new Date(),
          },
        ])
      })
      rerender(<Notifications />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Second Notification', expect.any(Object))
        expect(mockToast).toHaveBeenCalledTimes(1)
      })
    })

    it('should include app icon when appId is provided', async () => {
      const mockIcon = '<svg><circle cx="10" cy="10" r="5" /></svg>'
      uiState$.icons.set({ polkadot: mockIcon })

      const notification: Notification = {
        id: '1',
        title: 'Polkadot Notification',
        description: 'Notification with icon',
        type: 'info',
        appId: 'polkadot',
        createdAt: new Date(),
      }

      const { rerender } = render(<Notifications />)

      act(() => {
        notifications$.active.set([notification])
      })
      rerender(<Notifications />)

      await waitFor(() => {
        expect(mockToastCustom).toHaveBeenCalled()
      })

      // Check that the custom toast function was called with proper params
      const customToastCall = mockToastCustom.mock.calls[0]
      const ToastComponent = customToastCall[0]

      // Render the toast component (receives toastId as parameter)
      render(ToastComponent('test-id'))

      expect(screen.getByText('Polkadot Notification')).toBeInTheDocument()
      expect(screen.getByText('Notification with icon')).toBeInTheDocument()

      // The icon is now rendered as text content in the muified HTML
      const muifiedHtml = screen.getByTestId('muified-html')
      expect(muifiedHtml).toHaveTextContent('<svg><circle cx="10" cy="10" r="5" /></svg>')
    })
  })

  describe('NotificationToast component', () => {
    it('should render notification toast with all elements', async () => {
      const notification: Notification = {
        id: '1',
        title: 'Test Title',
        description: 'Test Description',
        type: 'info',
        createdAt: new Date(),
      }

      const { rerender } = render(<Notifications />)

      act(() => {
        notifications$.active.set([notification])
      })
      rerender(<Notifications />)

      await waitFor(() => {
        expect(mockToastCustom).toHaveBeenCalled()
      })

      // Get the custom toast component and render it
      const customToastCall = mockToastCustom.mock.calls[0]
      const ToastComponent = customToastCall[0]

      render(ToastComponent('test-id'))

      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Description')).toBeInTheDocument()
      expect(screen.getByTestId('button')).toHaveTextContent('Dismiss')

      // Check that time is displayed (format: HH:MM)
      const timeRegex = /\d{1,2}:\d{2}/
      const timeElement = screen.getByText(timeRegex)
      expect(timeElement).toBeInTheDocument()
    })

    it('should call toast.dismiss when dismiss button is clicked', async () => {
      const notification: Notification = {
        id: '1',
        title: 'Dismissible Notification',
        description: 'Click dismiss to close',
        type: 'info',
        createdAt: new Date(),
      }

      const { rerender } = render(<Notifications />)

      act(() => {
        notifications$.active.set([notification])
      })
      rerender(<Notifications />)

      await waitFor(() => {
        expect(mockToastCustom).toHaveBeenCalled()
      })

      // Get and render the custom toast component
      const customToastCall = mockToastCustom.mock.calls[0]
      const ToastComponent = customToastCall[0]
      const toastId = 'test-toast-id'

      // The component receives toastId as the first parameter, not as a prop
      render(ToastComponent(toastId))

      const dismissButton = screen.getByTestId('button')
      fireEvent.click(dismissButton)

      expect(mockToastDismiss).toHaveBeenCalledWith(toastId)
    })
  })

  describe('edge cases', () => {
    it('should handle empty active notifications array', () => {
      notifications$.active.set([])

      render(<Notifications />)

      expect(mockToast).not.toHaveBeenCalled()
      expect(mockToastCustom).not.toHaveBeenCalled()
    })

    it('should handle null active notifications', () => {
      // @ts-expect-error Testing null case
      notifications$.active.set(null)

      render(<Notifications />)

      expect(mockToast).not.toHaveBeenCalled()
      expect(mockToastCustom).not.toHaveBeenCalled()
    })

    it('should handle missing app icon gracefully', async () => {
      uiState$.icons.set({}) // No icons available

      const notification: Notification = {
        id: '1',
        title: 'Missing Icon',
        description: 'App icon not found',
        type: 'info',
        appId: 'nonexistent',
        createdAt: new Date(),
      }

      const { rerender } = render(<Notifications />)

      act(() => {
        notifications$.active.set([notification])
      })
      rerender(<Notifications />)

      await waitFor(() => {
        expect(mockToastCustom).toHaveBeenCalled()
      })

      const customToastCall = mockToastCustom.mock.calls[0]
      const ToastComponent = customToastCall[0]

      const { container } = render(ToastComponent('test-id'))

      expect(screen.getByText('Missing Icon')).toBeInTheDocument()
      expect(container.querySelector('svg')).not.toBeInTheDocument()
    })
  })

  describe('toast configuration', () => {
    it('should use correct toast configuration', async () => {
      const notification: Notification = {
        id: '1',
        title: 'Config Test',
        description: 'Testing toast configuration',
        type: 'info',
        createdAt: new Date(),
      }

      const { rerender } = render(<Notifications />)

      act(() => {
        notifications$.active.set([notification])
      })
      rerender(<Notifications />)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith('Config Test', {
          duration: 5000,
          dismissible: true,
          style: {
            display: 'flex',
            flexDirection: 'column',
          },
          classNames: {
            content: 'w-full',
            toast: 'bg-white/90 backdrop-blur-md border border-white/20 shadow-lg rounded-md p-4 w-sm min-w-sm max-w-sm',
          },
        })
      })

      expect(mockToastCustom).toHaveBeenCalledWith(expect.any(Function), {
        id: 'toast-id-1',
      })
    })
  })
})
