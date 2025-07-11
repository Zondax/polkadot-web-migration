import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import EmptyStateRow from '../empty-state-row'

describe('EmptyStateRow component', () => {
  const mockIcon = <div data-testid="mock-icon">Mock Icon</div>
  const mockLabel = 'No data available'

  describe('basic rendering', () => {
    it('should render the component with label and icon', () => {
      render(<EmptyStateRow label={mockLabel} icon={mockIcon} />)

      expect(screen.getByText(mockLabel)).toBeInTheDocument()
      expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
    })

    it('should render with correct container styling', () => {
      const { container } = render(<EmptyStateRow label={mockLabel} icon={mockIcon} />)

      const containerDiv = container.firstChild as HTMLElement
      expect(containerDiv).toHaveClass(
        'bg-gray-50',
        'rounded-lg',
        'shadow-xs',
        'border',
        'border-gray-200',
        'mb-4',
        'flex',
        'items-center',
        'justify-center',
        'min-h-[80px]',
        'px-3'
      )
    })

    it('should render content with correct flex layout', () => {
      render(<EmptyStateRow label={mockLabel} icon={mockIcon} />)

      const contentDiv = screen.getByText(mockLabel).parentElement
      expect(contentDiv).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'w-full', 'gap-2', 'py-8')
    })

    it('should render label with correct styling', () => {
      render(<EmptyStateRow label={mockLabel} icon={mockIcon} />)

      const labelElement = screen.getByText(mockLabel)
      expect(labelElement).toHaveClass('text-gray-500', 'text-base', 'font-medium', 'text-center', 'max-w-lg', 'mx-auto')
    })
  })

  describe('content variations', () => {
    it('should render with different label text', () => {
      const customLabel = 'Custom empty state message'
      render(<EmptyStateRow label={customLabel} icon={mockIcon} />)

      expect(screen.getByText(customLabel)).toBeInTheDocument()
    })

    it('should render with different icon', () => {
      const customIcon = (
        <svg data-testid="custom-svg-icon">
          <title>Custom SVG</title>Custom SVG
        </svg>
      )
      render(<EmptyStateRow label={mockLabel} icon={customIcon} />)

      expect(screen.getByTestId('custom-svg-icon')).toBeInTheDocument()
    })

    it('should render with complex icon component', () => {
      const complexIcon = (
        <div data-testid="complex-icon" className="text-blue-500">
          <span>Complex</span>
          <span>Icon</span>
        </div>
      )

      render(<EmptyStateRow label={mockLabel} icon={complexIcon} />)

      const iconElement = screen.getByTestId('complex-icon')
      expect(iconElement).toBeInTheDocument()
      expect(iconElement).toHaveTextContent('ComplexIcon')
    })

    it('should handle empty label gracefully', () => {
      const { container } = render(<EmptyStateRow label="" icon={mockIcon} />)

      const labelElement = container.querySelector('span.text-gray-500')
      expect(labelElement).toBeInTheDocument()
      expect(labelElement?.textContent).toBe('')
    })

    it('should handle long label text', () => {
      const longLabel =
        'This is a very long label that should still be displayed correctly within the max-width constraints of the component layout'
      render(<EmptyStateRow label={longLabel} icon={mockIcon} />)

      expect(screen.getByText(longLabel)).toBeInTheDocument()
    })
  })

  describe('layout and structure', () => {
    it('should have icon rendered before label in DOM order', () => {
      render(<EmptyStateRow label={mockLabel} icon={mockIcon} />)

      const contentDiv = screen.getByText(mockLabel).parentElement
      const children = Array.from(contentDiv?.children || [])

      expect(children[0]).toContainElement(screen.getByTestId('mock-icon'))
      expect(children[1]).toBe(screen.getByText(mockLabel))
    })

    it('should maintain proper spacing between icon and label', () => {
      render(<EmptyStateRow label={mockLabel} icon={mockIcon} />)

      const contentDiv = screen.getByText(mockLabel).parentElement
      expect(contentDiv).toHaveClass('gap-2')
    })

    it('should have minimum height constraint', () => {
      const { container } = render(<EmptyStateRow label={mockLabel} icon={mockIcon} />)

      const containerDiv = container.firstChild as HTMLElement
      expect(containerDiv).toHaveClass('min-h-[80px]')
    })
  })

  describe('accessibility', () => {
    it('should be accessible to screen readers', () => {
      render(<EmptyStateRow label={mockLabel} icon={mockIcon} />)

      // The label should be readable
      expect(screen.getByText(mockLabel)).toBeInTheDocument()
    })

    it('should handle special characters in label', () => {
      const specialLabel = 'No data found! Try again... (0 results)'
      render(<EmptyStateRow label={specialLabel} icon={mockIcon} />)

      expect(screen.getByText(specialLabel)).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should render when icon is null', () => {
      render(<EmptyStateRow label={mockLabel} icon={null} />)

      expect(screen.getByText(mockLabel)).toBeInTheDocument()
    })

    it('should render when icon is undefined', () => {
      render(<EmptyStateRow label={mockLabel} icon={undefined} />)

      expect(screen.getByText(mockLabel)).toBeInTheDocument()
    })

    it('should handle icon with no content', () => {
      const emptyIcon = <div data-testid="empty-icon" />
      render(<EmptyStateRow label={mockLabel} icon={emptyIcon} />)

      expect(screen.getByTestId('empty-icon')).toBeInTheDocument()
      expect(screen.getByText(mockLabel)).toBeInTheDocument()
    })
  })
})
