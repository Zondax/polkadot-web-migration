import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SuccessDialog } from '../success-dialog'

// Mock dependencies
vi.mock('lucide-react', () => ({
  CheckCircle: vi.fn(({ className }) => (
    <div data-testid="check-circle-icon" className={className}>
      CheckCircle
    </div>
  )),
}))

// Import the Dialog mock to check its calls
import { Dialog } from '@/components/ui/dialog'

vi.mock('@/components/ui/dialog', () => ({
  Dialog: vi.fn(({ children, open }) => (open ? <div data-testid="dialog">{children}</div> : null)),
  DialogContent: vi.fn(({ children, className }) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  )),
  DialogHeader: vi.fn(({ children, className }) => (
    <div data-testid="dialog-header" className={className}>
      {children}
    </div>
  )),
  DialogTitle: vi.fn(({ children }) => <h2>{children}</h2>),
  DialogDescription: vi.fn(({ children, className }) => <p className={className}>{children}</p>),
  DialogFooter: vi.fn(({ children }) => <div data-testid="dialog-footer">{children}</div>),
}))

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick, variant, className }) => (
    <button type="button" onClick={onClick} data-variant={variant} className={className}>
      {children}
    </button>
  )),
}))

describe('SuccessDialog component', () => {
  const mockOnClose = vi.fn()
  const mockOnReturn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render dialog when open', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      expect(screen.getByTestId('dialog')).toBeInTheDocument()
      expect(screen.getByText('Migration Processed')).toBeInTheDocument()
    })

    it('should not render dialog when closed', () => {
      render(<SuccessDialog open={false} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument()
    })

    it('should render check circle icon', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      const icon = screen.getByTestId('check-circle-icon')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('h-6', 'w-6', 'text-green-500')
    })

    it('should display success and total counts', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={7} totalCount={10} />)

      expect(screen.getByText('All selected transactions have been processed. 7 out of 10 were successful.')).toBeInTheDocument()
    })

    it('should display additional description', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      expect(screen.getByText('Review the details below to see the outcome of each transaction.')).toBeInTheDocument()
    })

    it('should apply correct styling classes', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      const dialogContent = screen.getByTestId('dialog-content')
      expect(dialogContent).toHaveClass('sm:max-w-md', 'text-center')

      const dialogHeader = screen.getByTestId('dialog-header')
      expect(dialogHeader).toHaveClass('items-center')

      const secondDescription = screen.getByText('Review the details below to see the outcome of each transaction.')
      expect(secondDescription).toHaveClass('pt-3')
    })
  })

  describe('button interactions', () => {
    it('should render View Details button', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      const viewDetailsButton = screen.getByRole('button', { name: 'View Details' })
      expect(viewDetailsButton).toBeInTheDocument()
      expect(viewDetailsButton).toHaveAttribute('data-variant', 'outline')
    })

    it('should render Return to Home button', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      const returnButton = screen.getByRole('button', { name: 'Return to Home' })
      expect(returnButton).toBeInTheDocument()
      expect(returnButton).toHaveClass('bg-[#7916F3]', 'hover:bg-[#6B46C1]', 'text-white')
    })

    it('should call onClose when View Details is clicked', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      const viewDetailsButton = screen.getByRole('button', { name: 'View Details' })
      fireEvent.click(viewDetailsButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnReturn).not.toHaveBeenCalled()
    })

    it('should call onReturn when Return to Home is clicked', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      const returnButton = screen.getByRole('button', { name: 'Return to Home' })
      fireEvent.click(returnButton)

      expect(mockOnReturn).toHaveBeenCalledTimes(1)
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle all successful transactions', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={10} totalCount={10} />)

      expect(screen.getByText('All selected transactions have been processed. 10 out of 10 were successful.')).toBeInTheDocument()
    })

    it('should handle no successful transactions', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={0} totalCount={10} />)

      expect(screen.getByText('All selected transactions have been processed. 0 out of 10 were successful.')).toBeInTheDocument()
    })

    it('should handle single transaction', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={1} totalCount={1} />)

      expect(screen.getByText('All selected transactions have been processed. 1 out of 1 were successful.')).toBeInTheDocument()
    })

    it('should handle zero total count', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={0} totalCount={0} />)

      expect(screen.getByText('All selected transactions have been processed. 0 out of 0 were successful.')).toBeInTheDocument()
    })
  })

  describe('dialog behavior', () => {
    it('should pass correct props to Dialog component', () => {
      render(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />)

      // Verify that Dialog was called with correct props
      expect(Dialog).toHaveBeenCalledWith(
        expect.objectContaining({
          open: true,
          onOpenChange: mockOnClose,
        }),
        undefined
      )
    })
  })

  describe('prop updates', () => {
    it('should update counts when props change', () => {
      const { rerender } = render(
        <SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />
      )

      expect(screen.getByText('All selected transactions have been processed. 5 out of 10 were successful.')).toBeInTheDocument()

      rerender(<SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={8} totalCount={12} />)

      expect(screen.getByText('All selected transactions have been processed. 8 out of 12 were successful.')).toBeInTheDocument()
    })

    it('should handle callback prop updates', () => {
      const newOnClose = vi.fn()
      const newOnReturn = vi.fn()

      const { rerender } = render(
        <SuccessDialog open={true} onClose={mockOnClose} onReturn={mockOnReturn} successCount={5} totalCount={10} />
      )

      rerender(<SuccessDialog open={true} onClose={newOnClose} onReturn={newOnReturn} successCount={5} totalCount={10} />)

      const viewDetailsButton = screen.getByRole('button', { name: 'View Details' })
      fireEvent.click(viewDetailsButton)

      expect(newOnClose).toHaveBeenCalledTimes(1)
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })
})
