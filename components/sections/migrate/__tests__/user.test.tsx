import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the useConnection hook with hoisted functions
const { mockConnectDevice, mockDisconnectDevice, mockUseConnection } = vi.hoisted(() => ({
  mockConnectDevice: vi.fn(),
  mockDisconnectDevice: vi.fn(),
  mockUseConnection: vi.fn(() => ({
    connectDevice: vi.fn(),
    disconnectDevice: vi.fn(),
    isLedgerConnected: false,
  })),
}))

vi.mock('@/components/hooks/useConnection', () => ({
  useConnection: mockUseConnection,
}))

// Mock the UI components
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, variant, size, className, ...props }: any) => (
    <button type="button" data-variant={variant} data-size={size} className={className} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div data-testid="dropdown-trigger" data-as-child={asChild}>
      {children}
    </div>
  ),
  DropdownMenuContent: ({ children, align }: any) => (
    <div data-testid="dropdown-content" data-align={align}>
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div data-testid="dropdown-label">{children}</div>,
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
  DropdownMenuItem: ({ children, onClick, disabled }: any) => (
    <button data-testid="dropdown-item" onClick={disabled ? undefined : onClick} data-disabled={disabled} type="button">
      {children}
    </button>
  ),
}))

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
  User: ({ className }: any) => (
    <svg data-testid="user-icon" className={className}>
      <title>User Icon</title>
      User Icon
    </svg>
  ),
}))

// Mock the observer HOC
vi.mock('@legendapp/state/react', () => ({
  observer: (Component: any) => Component,
}))

import User from '../user'

describe('User component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render the user dropdown trigger button', () => {
      render(<User />)

      const button = screen.getByRole('button', { name: /user icon/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('data-variant', 'outline')
      expect(button).toHaveAttribute('data-size', 'icon')
    })

    it('should render the user icon in the button', () => {
      render(<User />)

      const userIcon = screen.getByTestId('user-icon')
      expect(userIcon).toBeInTheDocument()
      expect(userIcon).toHaveClass('h-5 w-5')
    })

    it('should render button with correct styling classes', () => {
      render(<User />)

      const button = screen.getByRole('button', { name: /user icon/i })
      expect(button).toHaveClass('rounded-full', 'border-white/30', 'bg-white/10', 'hover:bg-white/20', 'text-white')
    })

    it('should render dropdown menu structure', () => {
      render(<User />)

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument()
    })

    it('should render dropdown content with correct alignment', () => {
      render(<User />)

      const dropdownContent = screen.getByTestId('dropdown-content')
      expect(dropdownContent).toHaveAttribute('data-align', 'end')
    })
  })

  describe('dropdown menu items', () => {
    it('should render account label', () => {
      render(<User />)

      const label = screen.getByTestId('dropdown-label')
      expect(label).toHaveTextContent('My Account')
    })

    it('should render separator', () => {
      render(<User />)

      expect(screen.getByTestId('dropdown-separator')).toBeInTheDocument()
    })

    it('should render all menu items', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      expect(menuItems).toHaveLength(3)
    })

    it('should render settings menu item as disabled', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const settingsItem = menuItems.find(item => item.textContent === 'Settings')
      expect(settingsItem).toHaveAttribute('data-disabled', 'true')
    })

    it('should render support menu item as disabled', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const supportItem = menuItems.find(item => item.textContent === 'Support')
      expect(supportItem).toHaveAttribute('data-disabled', 'true')
    })
  })

  describe('wallet connection - disconnected state', () => {
    beforeEach(() => {
      mockUseConnection.mockReturnValue({
        connectDevice: mockConnectDevice,
        disconnectDevice: mockDisconnectDevice,
        isLedgerConnected: false,
      })
    })

    it('should show "Connect your wallet" when disconnected', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const connectItem = menuItems.find(item => item.textContent === 'Connect your wallet')
      expect(connectItem).toBeInTheDocument()
    })

    it('should call connectDevice when connect item is clicked', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const connectItem = menuItems.find(item => item.textContent === 'Connect your wallet')
      expect(connectItem).toBeTruthy()
      if (!connectItem) throw new Error('Connect item not found')

      fireEvent.click(connectItem)
      expect(mockConnectDevice).toHaveBeenCalledTimes(1)
    })

    it('should not call disconnectDevice when connect item is clicked', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const connectItem = menuItems.find(item => item.textContent === 'Connect your wallet')
      expect(connectItem).toBeTruthy()
      if (!connectItem) throw new Error('Connect item not found')

      fireEvent.click(connectItem)
      expect(mockDisconnectDevice).not.toHaveBeenCalled()
    })
  })

  describe('wallet connection - connected state', () => {
    beforeEach(() => {
      mockUseConnection.mockReturnValue({
        connectDevice: mockConnectDevice,
        disconnectDevice: mockDisconnectDevice,
        isLedgerConnected: true,
      })
    })

    it('should show "Disconnect wallet" when connected', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const disconnectItem = menuItems.find(item => item.textContent === 'Disconnect wallet')
      expect(disconnectItem).toBeInTheDocument()
    })

    it('should call disconnectDevice when disconnect item is clicked', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const disconnectItem = menuItems.find(item => item.textContent === 'Disconnect wallet')
      expect(disconnectItem).toBeTruthy()
      if (!disconnectItem) throw new Error('Disconnect item not found')

      fireEvent.click(disconnectItem)
      expect(mockDisconnectDevice).toHaveBeenCalledTimes(1)
    })

    it('should not call connectDevice when disconnect item is clicked', () => {
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const disconnectItem = menuItems.find(item => item.textContent === 'Disconnect wallet')
      expect(disconnectItem).toBeTruthy()
      if (!disconnectItem) throw new Error('Disconnect item not found')

      fireEvent.click(disconnectItem)
      expect(mockConnectDevice).not.toHaveBeenCalled()
    })
  })

  describe('hook integration', () => {
    it('should call useConnection hook', () => {
      render(<User />)

      expect(mockUseConnection).toHaveBeenCalled()
    })

    it('should handle multiple connection state changes', () => {
      const { rerender } = render(<User />)

      // Initially disconnected
      mockUseConnection.mockReturnValue({
        connectDevice: mockConnectDevice,
        disconnectDevice: mockDisconnectDevice,
        isLedgerConnected: false,
      })

      rerender(<User />)
      expect(screen.getByText('Connect your wallet')).toBeInTheDocument()

      // Change to connected
      mockUseConnection.mockReturnValue({
        connectDevice: mockConnectDevice,
        disconnectDevice: mockDisconnectDevice,
        isLedgerConnected: true,
      })

      rerender(<User />)
      expect(screen.getByText('Disconnect wallet')).toBeInTheDocument()
    })
  })

  describe('disabled menu items', () => {
    it('should not trigger onClick for disabled settings item', () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation()
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const settingsItem = menuItems.find(item => item.textContent === 'Settings')
      expect(settingsItem).toBeTruthy()
      if (!settingsItem) throw new Error('Settings item not found')

      fireEvent.click(settingsItem)
      // Should not trigger any action since it's disabled
      expect(consoleLog).not.toHaveBeenCalled()

      consoleLog.mockRestore()
    })

    it('should not trigger onClick for disabled support item', () => {
      const consoleLog = vi.spyOn(console, 'log').mockImplementation()
      render(<User />)

      const menuItems = screen.getAllByTestId('dropdown-item')
      const supportItem = menuItems.find(item => item.textContent === 'Support')
      expect(supportItem).toBeTruthy()
      if (!supportItem) throw new Error('Support item not found')

      fireEvent.click(supportItem)
      // Should not trigger any action since it's disabled
      expect(consoleLog).not.toHaveBeenCalled()

      consoleLog.mockRestore()
    })
  })

  describe('accessibility', () => {
    it('should be accessible as a button', () => {
      render(<User />)

      const button = screen.getByRole('button', { name: /user icon/i })
      expect(button).toBeInTheDocument()
      expect(button.tagName).toBe('BUTTON')
    })

    it('should have proper dropdown structure for screen readers', () => {
      render(<User />)

      expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-trigger')).toBeInTheDocument()
      expect(screen.getByTestId('dropdown-content')).toBeInTheDocument()
    })
  })
})
