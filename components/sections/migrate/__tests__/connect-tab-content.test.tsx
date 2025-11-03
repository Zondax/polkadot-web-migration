import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConnectTabContent } from '../connect-tab-content'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, initial, whileInView, viewport, transition, ...props }: any) => (
      <div className={className} data-testid="motion-div" {...props}>
        {children}
      </div>
    ),
  },
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Info: ({ className }: { className?: string }) => (
    <div data-testid="info-icon" className={className}>
      Info
    </div>
  ),
}))

// Create stable mock functions and state
const mockConnectDevice = vi.fn()
const mockUseConnectionReturn = {
  get isLedgerConnected() {
    return mockIsLedgerConnected
  },
  get isAppOpen() {
    return mockIsAppOpen
  },
  connectDevice: mockConnectDevice,
}

// Mock useConnection hook with stable references
vi.mock('@/components/hooks/useConnection', () => ({
  useConnection: () => mockUseConnectionReturn,
}))

// Mock Button component
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, size, ...props }: any) => (
    <button className={className} onClick={onClick} data-size={size} data-testid="connect-ledger-button" {...props}>
      {children}
    </button>
  ),
}))

// Create mock variables that can be updated
let mockIsLedgerConnected = false
let mockIsAppOpen = false

const mockOnContinue = vi.fn()

describe('ConnectTabContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLedgerConnected = false
    mockIsAppOpen = false
    mockConnectDevice.mockResolvedValue(false)
  })

  describe('Component Rendering', () => {
    it('should render main heading and description', () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      expect(screen.getByText('Connect Your Device')).toBeInTheDocument()
      expect(screen.getByText(/Follow these steps to securely connect your hardware device/)).toBeInTheDocument()
    })

    it('should render all four connection steps', () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      expect(screen.getByText('Connect your Ledger device')).toBeInTheDocument()
      expect(screen.getByText('Enter your PIN code')).toBeInTheDocument()
      expect(screen.getByText('Open the Migration App')).toBeInTheDocument()
      expect(screen.getByText('Click Connect')).toBeInTheDocument()
    })

    it('should render step descriptions', () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      expect(screen.getByText(/Ensure your Ledger device is properly connected/)).toBeInTheDocument()
      expect(screen.getByText(/Unlock your Ledger device by entering your PIN code/)).toBeInTheDocument()
      expect(screen.getByText(/Navigate to and open the Polkadot Migration App/)).toBeInTheDocument()
      expect(screen.getByText(/Once the previous steps are completed, click the "Connect" button/)).toBeInTheDocument()
    })

    it.skip('should render Ledger Live info section', () => {
      // This test is skipped because Ledger Live section was removed from the component
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      expect(screen.getByText('Polkadot Migration App Not Installed?')).toBeInTheDocument()
      expect(screen.getByText(/If you don't have the Polkadot Migration App/)).toBeInTheDocument()

      const ledgerLiveLink = screen.getByRole('link', { name: 'Ledger Live' })
      expect(ledgerLiveLink).toHaveAttribute('href', 'https://www.ledger.com/ledger-live')
      expect(ledgerLiveLink).toHaveAttribute('target', '_blank')
      expect(ledgerLiveLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should render connect button', () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const connectButton = screen.getByTestId('connect-ledger-button')
      expect(connectButton).toBeInTheDocument()
      expect(connectButton).toHaveTextContent('Connect')
      expect(connectButton).toHaveAttribute('data-size', 'lg')
    })

    it('should render step numbers correctly', () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      // Check that step numbers 1-4 are rendered
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
    })
  })

  describe('Step Status Highlighting', () => {
    it('should highlight first two steps when ledger is connected but app is not open', () => {
      mockIsLedgerConnected = true
      mockIsAppOpen = false

      const { container } = render(<ConnectTabContent onContinue={mockOnContinue} />)

      // Find step containers by their content
      const stepContainers = container.querySelectorAll('.rounded-xl')

      // First two steps should be highlighted (ledger connected)
      expect(stepContainers[0]).toHaveClass('border-polkadot-green', 'bg-polkadot-green/10')
      expect(stepContainers[1]).toHaveClass('border-polkadot-green', 'bg-polkadot-green/10')

      // Third step should show warning (app not open)
      expect(stepContainers[2]).toHaveClass('border-rose-400', 'bg-rose-50')

      // Fourth step should not be highlighted
      expect(stepContainers[3]).not.toHaveClass('border-polkadot-green')
    })

    it('should highlight first three steps when ledger is connected and app is open', () => {
      mockIsLedgerConnected = true
      mockIsAppOpen = true

      const { container } = render(<ConnectTabContent onContinue={mockOnContinue} />)

      const stepContainers = container.querySelectorAll('.rounded-xl')

      // First three steps should be highlighted
      expect(stepContainers[0]).toHaveClass('border-polkadot-green', 'bg-polkadot-green/10')
      expect(stepContainers[1]).toHaveClass('border-polkadot-green', 'bg-polkadot-green/10')
      expect(stepContainers[2]).toHaveClass('border-polkadot-green', 'bg-polkadot-green/10')

      // Fourth step should not be highlighted
      expect(stepContainers[3]).not.toHaveClass('border-polkadot-green')
    })

    it('should not highlight any steps when ledger is not connected', () => {
      mockIsLedgerConnected = false
      mockIsAppOpen = false

      const { container } = render(<ConnectTabContent onContinue={mockOnContinue} />)

      const stepContainers = container.querySelectorAll('.rounded-xl')

      // No steps should be highlighted
      for (const stepContainer of Array.from(stepContainers)) {
        expect(stepContainer).not.toHaveClass('border-polkadot-green')
        expect(stepContainer).not.toHaveClass('bg-polkadot-green/10')
      }
    })
  })

  describe('Step Number Highlighting', () => {
    it('should highlight step numbers when conditions are met', () => {
      mockIsLedgerConnected = true
      mockIsAppOpen = true

      const { container } = render(<ConnectTabContent onContinue={mockOnContinue} />)

      // Find step number elements
      const stepNumbers = container.querySelectorAll('.rounded-full')

      // First three step numbers should be highlighted
      expect(stepNumbers[0]).toHaveClass('bg-polkadot-green/20', 'text-polkadot-green')
      expect(stepNumbers[1]).toHaveClass('bg-polkadot-green/20', 'text-polkadot-green')
      expect(stepNumbers[2]).toHaveClass('bg-polkadot-green/20', 'text-polkadot-green')

      // Fourth step number should not be highlighted
      expect(stepNumbers[3]).toHaveClass('bg-purple-100', 'text-purple-600')
    })

    it('should show warning colors for step 3 when ledger connected but app not open', () => {
      mockIsLedgerConnected = true
      mockIsAppOpen = false

      const { container } = render(<ConnectTabContent onContinue={mockOnContinue} />)

      const stepNumbers = container.querySelectorAll('.rounded-full')

      // Third step number should show warning colors
      expect(stepNumbers[2]).toHaveClass('bg-rose-100', 'text-rose-400')
    })
  })

  describe('Connect Button Interaction', () => {
    it('should call connectDevice when connect button is clicked', async () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const connectButton = screen.getByTestId('connect-ledger-button')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(mockConnectDevice).toHaveBeenCalledTimes(1)
      })
    })

    it('should call onContinue when connection is successful', async () => {
      mockConnectDevice.mockResolvedValue(true)

      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const connectButton = screen.getByTestId('connect-ledger-button')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(mockConnectDevice).toHaveBeenCalledTimes(1)
        expect(mockOnContinue).toHaveBeenCalledTimes(1)
      })
    })

    it('should not call onContinue when connection fails', async () => {
      mockConnectDevice.mockResolvedValue(false)

      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const connectButton = screen.getByTestId('connect-ledger-button')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(mockConnectDevice).toHaveBeenCalledTimes(1)
      })

      // Give a small delay to ensure onContinue is not called
      await new Promise(resolve => setTimeout(resolve, 50))
      expect(mockOnContinue).not.toHaveBeenCalled()
    })

    it('should handle connection errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockConnectDevice.mockRejectedValue(new Error('Connection failed'))

      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const connectButton = screen.getByTestId('connect-ledger-button')
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(mockConnectDevice).toHaveBeenCalledTimes(1)
      })

      // Should not call onContinue when error occurs
      expect(mockOnContinue).not.toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Layout and Styling', () => {
    it('should render with correct grid layout classes', () => {
      const { container } = render(<ConnectTabContent onContinue={mockOnContinue} />)

      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'gap-6')
    })

    it('should render info icon in info section', () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const infoIcon = screen.getByTestId('info-icon')
      expect(infoIcon).toBeInTheDocument()
      // Icon size was changed to match badge icon sizes (h-4 w-4)
      expect(infoIcon).toHaveClass('h-4', 'w-4')
    })

    it('should render connect button with correct styling classes', () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const connectButton = screen.getByTestId('connect-ledger-button')
      expect(connectButton).toHaveClass(
        'mt-2',
        'px-8',
        'py-3',
        'rounded-md',
        'text-lg',
        'font-semibold',
        'bg-[#7916F3]',
        'hover:bg-[#6B46C1]',
        'text-white',
        'shadow-lg'
      )
    })
  })

  describe('Accessibility', () => {
    it.skip('should have proper link attributes for external link', () => {
      // This test is skipped because Ledger Live link was removed from the component
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const ledgerLiveLink = screen.getByRole('link', { name: 'Ledger Live' })
      expect(ledgerLiveLink).toHaveClass('underline', 'text-blue-700', 'hover:text-blue-900')
    })

    it('should render proper semantic structure with headings', () => {
      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const heading = screen.getByRole('heading', { level: 2 })
      expect(heading).toHaveTextContent('Connect Your Device')
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple rapid button clicks', async () => {
      mockConnectDevice.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))

      render(<ConnectTabContent onContinue={mockOnContinue} />)

      const connectButton = screen.getByTestId('connect-ledger-button')

      // Click button multiple times rapidly
      fireEvent.click(connectButton)
      fireEvent.click(connectButton)
      fireEvent.click(connectButton)

      await waitFor(() => {
        expect(mockConnectDevice).toHaveBeenCalledTimes(3)
      })
    })

    it('should maintain step highlighting state during connection attempt', async () => {
      mockIsLedgerConnected = true
      mockIsAppOpen = true
      mockConnectDevice.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 50)))

      const { container } = render(<ConnectTabContent onContinue={mockOnContinue} />)

      // Verify initial highlighting
      const stepContainers = container.querySelectorAll('.rounded-xl')
      expect(stepContainers[0]).toHaveClass('border-polkadot-green')
      expect(stepContainers[1]).toHaveClass('border-polkadot-green')
      expect(stepContainers[2]).toHaveClass('border-polkadot-green')

      const connectButton = screen.getByTestId('connect-ledger-button')
      fireEvent.click(connectButton)

      // Highlighting should persist during connection
      expect(stepContainers[0]).toHaveClass('border-polkadot-green')
      expect(stepContainers[1]).toHaveClass('border-polkadot-green')
      expect(stepContainers[2]).toHaveClass('border-polkadot-green')

      await waitFor(() => {
        expect(mockOnContinue).toHaveBeenCalledTimes(1)
      })
    })
  })
})
