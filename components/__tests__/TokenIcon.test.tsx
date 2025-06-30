import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TokenIcon from '../TokenIcon'

// Mock the muifyHtml utility
vi.mock('@/lib/utils', () => ({
  muifyHtml: vi.fn(),
}))

// Import the mocked utility
import { muifyHtml } from '@/lib/utils'
import type { MockedFunction } from 'vitest'

const mockMuifyHtml = muifyHtml as MockedFunction<typeof muifyHtml>

describe('TokenIcon component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMuifyHtml.mockImplementation((html: string) => <div dangerouslySetInnerHTML={{ __html: html }} />)
  })

  describe('basic rendering', () => {
    it('should render with symbol when no icon provided', () => {
      render(<TokenIcon symbol="DOT" />)

      expect(screen.getByText('DOT')).toBeInTheDocument()
      expect(mockMuifyHtml).not.toHaveBeenCalled()
    })

    it('should render icon when provided', () => {
      const iconSvg = '<svg><circle r="10"/></svg>'
      mockMuifyHtml.mockReturnValue(<svg data-testid="token-svg"><circle r="10" /></svg>)

      render(<TokenIcon symbol="DOT" icon={iconSvg} />)

      expect(screen.getByTestId('token-svg')).toBeInTheDocument()
      expect(mockMuifyHtml).toHaveBeenCalledWith(iconSvg)
      expect(screen.queryByText('DOT')).not.toBeInTheDocument()
    })

    it('should default to medium size', () => {
      const { container } = render(<TokenIcon symbol="DOT" />)

      const tokenIcon = container.firstChild as HTMLElement
      expect(tokenIcon).toHaveClass('h-8', 'w-8', '[&_svg]:h-8', '[&_svg]:w-8')
    })
  })

  describe('size variants', () => {
    it('should render small size correctly', () => {
      const { container } = render(<TokenIcon symbol="DOT" size="sm" />)

      const tokenIcon = container.firstChild as HTMLElement
      expect(tokenIcon).toHaveClass('h-6', 'w-6', '[&_svg]:h-6', '[&_svg]:w-6')
    })

    it('should render medium size correctly', () => {
      const { container } = render(<TokenIcon symbol="DOT" size="md" />)

      const tokenIcon = container.firstChild as HTMLElement
      expect(tokenIcon).toHaveClass('h-8', 'w-8', '[&_svg]:h-8', '[&_svg]:w-8')
    })

    it('should render large size correctly', () => {
      const { container } = render(<TokenIcon symbol="DOT" size="lg" />)

      const tokenIcon = container.firstChild as HTMLElement
      expect(tokenIcon).toHaveClass('h-12', 'w-12', '[&_svg]:h-12', '[&_svg]:w-12')
    })
  })

  describe('icon rendering', () => {
    it('should handle complex SVG icons', () => {
      const complexSvg = '<svg viewBox="0 0 24 24"><path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 10s9-4.45 9-10V7l-10-5z"/></svg>'
      mockMuifyHtml.mockReturnValue(<div data-testid="complex-icon">{complexSvg}</div>)

      render(<TokenIcon symbol="DOT" icon={complexSvg} />)

      expect(screen.getByTestId('complex-icon')).toBeInTheDocument()
      expect(mockMuifyHtml).toHaveBeenCalledWith(complexSvg)
    })

    it('should handle base64 image icons', () => {
      const base64Icon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      mockMuifyHtml.mockReturnValue(<img data-testid="base64-icon" src={base64Icon} alt="icon" />)

      render(<TokenIcon symbol="DOT" icon={base64Icon} />)

      expect(screen.getByTestId('base64-icon')).toBeInTheDocument()
      expect(mockMuifyHtml).toHaveBeenCalledWith(base64Icon)
    })

    it('should handle empty icon string', () => {
      render(<TokenIcon symbol="DOT" icon="" />)

      // Empty string should be falsy and show symbol instead
      expect(screen.getByText('DOT')).toBeInTheDocument()
      expect(mockMuifyHtml).not.toHaveBeenCalled()
    })

    it('should handle undefined icon', () => {
      render(<TokenIcon symbol="DOT" icon={undefined} />)

      expect(screen.getByText('DOT')).toBeInTheDocument()
      expect(mockMuifyHtml).not.toHaveBeenCalled()
    })
  })

  describe('symbol rendering', () => {
    it('should render single character symbols', () => {
      render(<TokenIcon symbol="D" />)

      expect(screen.getByText('D')).toBeInTheDocument()
    })

    it('should render long symbol names', () => {
      render(<TokenIcon symbol="POLKADOT" />)

      expect(screen.getByText('POLKADOT')).toBeInTheDocument()
    })

    it('should render symbols with special characters', () => {
      render(<TokenIcon symbol="DOT-USD" />)

      expect(screen.getByText('DOT-USD')).toBeInTheDocument()
    })

    it('should render empty symbol', () => {
      const { container } = render(<TokenIcon symbol="" />)

      const symbolSpan = container.querySelector('.text-xs.text-muted-foreground')
      expect(symbolSpan).toBeInTheDocument()
      expect(symbolSpan?.textContent).toBe('')
    })

    it('should render numeric symbols', () => {
      render(<TokenIcon symbol="123" />)

      expect(screen.getByText('123')).toBeInTheDocument()
    })
  })

  describe('CSS classes and styling', () => {
    it('should always have base classes', () => {
      const { container } = render(<TokenIcon symbol="DOT" />)

      const tokenIcon = container.firstChild as HTMLElement
      expect(tokenIcon).toHaveClass('overflow-hidden', 'rounded-full')
    })

    it('should apply correct classes for icon rendering', () => {
      const iconSvg = '<svg><circle r="10"/></svg>'
      mockMuifyHtml.mockReturnValue(<div data-testid="icon">Icon</div>)

      const { container } = render(<TokenIcon symbol="DOT" icon={iconSvg} />)

      const iconContainer = container.querySelector('.flex.h-full.w-full.items-center.justify-center')
      expect(iconContainer).toBeInTheDocument()
    })

    it('should apply correct classes for symbol rendering', () => {
      const { container } = render(<TokenIcon symbol="DOT" />)

      const symbolContainer = container.querySelector('.flex.h-full.items-center.justify-center.bg-muted')
      expect(symbolContainer).toBeInTheDocument()
      
      const symbolText = container.querySelector('.text-xs.text-muted-foreground')
      expect(symbolText).toBeInTheDocument()
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle muifyHtml returning null', () => {
      mockMuifyHtml.mockReturnValue(null)

      render(<TokenIcon symbol="DOT" icon="<svg></svg>" />)

      // Should still render the icon container even if muifyHtml returns null
      const iconContainer = document.querySelector('.flex.h-full.w-full.items-center.justify-center')
      expect(iconContainer).toBeInTheDocument()
    })

    it('should handle muifyHtml throwing an error', () => {
      mockMuifyHtml.mockImplementation(() => {
        throw new Error('HTML parsing failed')
      })

      expect(() => render(<TokenIcon symbol="DOT" icon="<invalid>" />)).toThrow('HTML parsing failed')
    })

    it('should handle very long symbols gracefully', () => {
      const longSymbol = 'A'.repeat(50)
      render(<TokenIcon symbol={longSymbol} />)

      expect(screen.getByText(longSymbol)).toBeInTheDocument()
    })

    it('should handle symbols with unicode characters', () => {
      const unicodeSymbol = '🚀 DOT 💎'
      render(<TokenIcon symbol={unicodeSymbol} />)

      expect(screen.getByText(unicodeSymbol)).toBeInTheDocument()
    })
  })

  describe('component behavior', () => {
    it('should prioritize icon over symbol when both provided', () => {
      const iconSvg = '<svg><circle r="10"/></svg>'
      mockMuifyHtml.mockReturnValue(<div data-testid="priority-icon">Icon</div>)

      render(<TokenIcon symbol="DOT" icon={iconSvg} />)

      expect(screen.getByTestId('priority-icon')).toBeInTheDocument()
      expect(screen.queryByText('DOT')).not.toBeInTheDocument()
    })

    it('should be accessible with proper structure', () => {
      const { container } = render(<TokenIcon symbol="DOT" />)

      const tokenIcon = container.firstChild as HTMLElement
      expect(tokenIcon.tagName).toBe('DIV')
      expect(tokenIcon).toHaveAttribute('class')
    })

    it('should handle rapid re-renders', () => {
      const { rerender } = render(<TokenIcon symbol="DOT" />)
      
      expect(screen.getByText('DOT')).toBeInTheDocument()

      rerender(<TokenIcon symbol="KSM" />)
      expect(screen.getByText('KSM')).toBeInTheDocument()
      expect(screen.queryByText('DOT')).not.toBeInTheDocument()
    })

    it('should handle prop changes correctly', () => {
      const iconSvg = '<svg><circle r="10"/></svg>'
      mockMuifyHtml.mockReturnValue(<div data-testid="dynamic-icon">Icon</div>)

      const { rerender } = render(<TokenIcon symbol="DOT" />)
      expect(screen.getByText('DOT')).toBeInTheDocument()

      rerender(<TokenIcon symbol="DOT" icon={iconSvg} />)
      expect(screen.getByTestId('dynamic-icon')).toBeInTheDocument()
      expect(screen.queryByText('DOT')).not.toBeInTheDocument()

      rerender(<TokenIcon symbol="KSM" />)
      expect(screen.getByText('KSM')).toBeInTheDocument()
      expect(screen.queryByTestId('dynamic-icon')).not.toBeInTheDocument()
    })
  })

  describe('integration with muifyHtml', () => {
    it('should pass correct HTML to muifyHtml', () => {
      const testHtml = '<div class="test">Test HTML</div>'
      
      render(<TokenIcon symbol="DOT" icon={testHtml} />)

      expect(mockMuifyHtml).toHaveBeenCalledWith(testHtml)
      expect(mockMuifyHtml).toHaveBeenCalledTimes(1)
    })

    it('should handle muifyHtml return values correctly', () => {
      const testIcon = <span data-testid="muify-result">Processed HTML</span>
      mockMuifyHtml.mockReturnValue(testIcon)

      render(<TokenIcon symbol="DOT" icon="<test>" />)

      expect(screen.getByTestId('muify-result')).toBeInTheDocument()
    })
  })
})