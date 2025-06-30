import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, transition, className, ...props }: any) => (
      <div
        className={className}
        data-initial={JSON.stringify(initial)}
        data-animate={JSON.stringify(animate)}
        data-transition={JSON.stringify(transition)}
        {...props}
      >
        {children}
      </div>
    ),
  },
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}))

// Mock tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <div data-testid="tooltip-provider">{children}</div>,
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: any) => <div data-testid="tooltip-trigger">{children}</div>,
  TooltipContent: ({ children, className }: any) => (
    <div data-testid="tooltip-content" className={className}>
      {children}
    </div>
  ),
}))

import { Header } from '../header'

describe('Header component', () => {
  describe('basic rendering', () => {
    it('should render the header element', () => {
      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('flex', 'justify-between', 'items-center', 'mb-8')
    })

    it('should render the main link with correct href', () => {
      render(<Header />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/')
      expect(link).toHaveClass('flex', 'items-center', 'space-x-2', 'group')
    })

    it('should render the application title', () => {
      render(<Header />)

      const title = screen.getByText('Polkadot Ledger Migration Assistant')
      expect(title).toBeInTheDocument()
      expect(title).toHaveClass('font-bold', 'text-lg', 'text-white')
    })

    it('should render the beta badge', () => {
      render(<Header />)

      const betaBadge = screen.getByText('BETA')
      expect(betaBadge).toBeInTheDocument()
      expect(betaBadge).toHaveClass('text-xs', 'px-2', 'py-0.5', 'bg-[#FF2670]', 'text-white', 'rounded-full')
    })
  })

  describe('logo design', () => {
    it('should render the outer logo circle with gradient background', () => {
      const { container } = render(<Header />)

      const outerCircle = container.querySelector('.w-10.h-10.rounded-full.bg-linear-to-r')
      expect(outerCircle).toBeInTheDocument()
      expect(outerCircle).toHaveClass(
        'w-10',
        'h-10',
        'rounded-full',
        'bg-linear-to-r',
        'from-[#FF2670]',
        'to-[#7916F3]',
        'flex',
        'items-center',
        'justify-center',
        'shadow-lg',
        'transition-transform',
        'group-hover:scale-105'
      )
    })

    it('should render the inner white circle', () => {
      const { container } = render(<Header />)

      const innerWhiteCircle = container.querySelector('.w-8.h-8.rounded-full.bg-white')
      expect(innerWhiteCircle).toBeInTheDocument()
      expect(innerWhiteCircle).toHaveClass('w-8', 'h-8', 'rounded-full', 'bg-white', 'flex', 'items-center', 'justify-center')
    })

    it('should render the innermost gradient circle', () => {
      const { container } = render(<Header />)

      const innermostCircle = container.querySelector('.w-6.h-6.rounded-full.bg-linear-to-r')
      expect(innermostCircle).toBeInTheDocument()
      expect(innermostCircle).toHaveClass('w-6', 'h-6', 'rounded-full', 'bg-linear-to-r', 'from-[#FF2670]', 'to-[#7916F3]')
    })

    it('should have proper hover effect classes on link', () => {
      render(<Header />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('group')
    })
  })

  describe('tooltip functionality', () => {
    it('should render tooltip provider', () => {
      render(<Header />)

      const tooltipProvider = screen.getByTestId('tooltip-provider')
      expect(tooltipProvider).toBeInTheDocument()
    })

    it('should render tooltip wrapper', () => {
      render(<Header />)

      const tooltip = screen.getByTestId('tooltip')
      expect(tooltip).toBeInTheDocument()
    })

    it('should render tooltip trigger with beta badge', () => {
      render(<Header />)

      const tooltipTrigger = screen.getByTestId('tooltip-trigger')
      expect(tooltipTrigger).toBeInTheDocument()
      expect(tooltipTrigger).toContainElement(screen.getByText('BETA'))
    })

    it('should render tooltip content with beta warning message', () => {
      render(<Header />)

      const tooltipContent = screen.getByTestId('tooltip-content')
      expect(tooltipContent).toBeInTheDocument()
      expect(tooltipContent).toHaveClass('max-w-xs')

      const message = screen.getByText(/This project is still in development/)
      expect(message).toBeInTheDocument()
      expect(message.textContent).toContain('testing purposes only')
      expect(message.textContent).toContain('small amounts')
    })
  })

  describe('framer motion animations', () => {
    it('should render left motion div with correct animation props', () => {
      const { container } = render(<Header />)

      const leftMotionDiv = container.querySelector('[data-initial]')
      expect(leftMotionDiv).toBeInTheDocument()
      expect(leftMotionDiv).toHaveAttribute('data-initial', '{"opacity":0,"x":-20}')
      expect(leftMotionDiv).toHaveAttribute('data-animate', '{"opacity":1,"x":0}')
      expect(leftMotionDiv).toHaveAttribute('data-transition', '{"duration":0.5}')
      expect(leftMotionDiv).toHaveClass('flex', 'items-center', 'space-x-2')
    })

    it('should render right motion div with correct animation props', () => {
      const { container } = render(<Header />)

      const motionDivs = container.querySelectorAll('[data-initial]')
      const rightMotionDiv = motionDivs[1] // Second motion div
      expect(rightMotionDiv).toBeInTheDocument()
      expect(rightMotionDiv).toHaveAttribute('data-initial', '{"opacity":0,"x":20}')
      expect(rightMotionDiv).toHaveAttribute('data-animate', '{"opacity":1,"x":0}')
      expect(rightMotionDiv).toHaveAttribute('data-transition', '{"duration":0.5}')
    })

    it('should have different initial x values for left and right animations', () => {
      const { container } = render(<Header />)

      const motionDivs = container.querySelectorAll('[data-initial]')
      const leftDiv = motionDivs[0]
      const rightDiv = motionDivs[1]

      expect(leftDiv).toHaveAttribute('data-initial', '{"opacity":0,"x":-20}')
      expect(rightDiv).toHaveAttribute('data-initial', '{"opacity":0,"x":20}')
    })
  })

  describe('layout structure', () => {
    it('should have proper flexbox layout', () => {
      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toHaveClass('flex', 'justify-between', 'items-center', 'mb-8')
    })

    it('should render link with proper flex classes', () => {
      render(<Header />)

      const link = screen.getByRole('link')
      expect(link).toHaveClass('flex', 'items-center', 'space-x-2')
    })

    it('should render title container with proper gap', () => {
      const { container } = render(<Header />)

      const titleContainer = container.querySelector('.flex.flex-row.gap-2')
      expect(titleContainer).toBeInTheDocument()
      expect(titleContainer).toHaveClass('flex', 'flex-row', 'gap-2')
    })

    it('should have beta badge within tooltip trigger', () => {
      render(<Header />)

      const tooltipTrigger = screen.getByTestId('tooltip-trigger')
      const betaBadge = screen.getByText('BETA')
      expect(tooltipTrigger).toContainElement(betaBadge)
    })
  })

  describe('accessibility', () => {
    it('should be accessible as a header landmark', () => {
      render(<Header />)

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })

    it('should have accessible link', () => {
      render(<Header />)

      const link = screen.getByRole('link')
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })

    it('should provide context for beta badge through tooltip', () => {
      render(<Header />)

      const betaBadge = screen.getByText('BETA')
      const tooltipContent = screen.getByTestId('tooltip-content')

      expect(betaBadge).toBeInTheDocument()
      expect(tooltipContent).toBeInTheDocument()
      expect(tooltipContent).toHaveTextContent('This project is still in development')
    })
  })

  describe('styling and visual elements', () => {
    it('should use correct brand colors in gradients', () => {
      const { container } = render(<Header />)

      const gradientElements = container.querySelectorAll('.from-\\[\\#FF2670\\].to-\\[\\#7916F3\\]')
      expect(gradientElements).toHaveLength(2) // Outer circle and inner circle
    })

    it('should use correct beta badge styling', () => {
      render(<Header />)

      const betaBadge = screen.getByText('BETA')
      expect(betaBadge).toHaveClass('bg-[#FF2670]')
      expect(betaBadge).toHaveClass('text-white')
      expect(betaBadge).toHaveClass('rounded-full')
    })

    it('should have shadow on logo', () => {
      const { container } = render(<Header />)

      const logoContainer = container.querySelector('.shadow-lg')
      expect(logoContainer).toBeInTheDocument()
    })
  })

  describe('commented user component', () => {
    it('should not render user component (commented out)', () => {
      render(<Header />)

      // The User component is commented out, so it shouldn't be rendered
      const userComponent = screen.queryByText(/user/i)
      expect(userComponent).not.toBeInTheDocument()
    })

    it('should render empty right motion div', () => {
      const { container } = render(<Header />)

      const motionDivs = container.querySelectorAll('[data-initial]')
      const rightMotionDiv = motionDivs[1]

      // Should be empty since User component is commented out
      expect(rightMotionDiv.textContent).toBe('')
    })
  })
})
