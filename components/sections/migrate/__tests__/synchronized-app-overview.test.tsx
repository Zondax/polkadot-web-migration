import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SynchronizedAppOverview from '../synchronized-app-overview'

// Mock the dependencies
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

vi.mock('@/components/hooks/useTokenLogo', () => ({
  useTokenLogo: vi.fn(),
}))

vi.mock('@/lib/utils/html', () => ({
  muifyHtml: vi.fn((html) => <div dangerouslySetInnerHTML={{ __html: html }} />),
}))

vi.mock('../balance-detail-card', () => ({
  BalanceTypeFlag: ({ type }: { type: string }) => <span data-testid="balance-flag">{type}</span>,
}))

import { useTokenLogo } from '@/components/hooks/useTokenLogo'
import { muifyHtml } from '@/lib/utils/html'

describe('SynchronizedAppOverview', () => {
  const defaultProps = {
    appId: 'polkadot',
    appName: 'Polkadot',
    accountCount: 3,
    totalBalance: '100.00 DOT',
  }

  beforeEach(() => {
    vi.mocked(useTokenLogo).mockReturnValue('<svg>icon</svg>')
    vi.mocked(muifyHtml).mockImplementation((html) => <div dangerouslySetInnerHTML={{ __html: html }} />)
  })

  it('should render app name and account count', () => {
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    expect(screen.getByText('Polkadot')).toBeInTheDocument()
    expect(screen.getByText('3 addresses')).toBeInTheDocument()
  })

  it('should render singular address for count of 1', () => {
    render(<SynchronizedAppOverview {...defaultProps} accountCount={1} />)
    
    expect(screen.getByText('1 address')).toBeInTheDocument()
  })

  it('should render total balance when provided', () => {
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    expect(screen.getAllByText('100.00 DOT')).toHaveLength(2) // Mobile and desktop versions
    expect(screen.getAllByTestId('balance-flag')).toHaveLength(2)
  })

  it('should not render balance when not provided', () => {
    render(<SynchronizedAppOverview {...defaultProps} totalBalance={undefined} />)
    
    expect(screen.queryByTestId('balance-flag')).not.toBeInTheDocument()
  })

  it('should render icon when provided', () => {
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    expect(useTokenLogo).toHaveBeenCalledWith('polkadot')
    expect(muifyHtml).toHaveBeenCalledWith('<svg>icon</svg>')
  })

  it('should not render icon when not provided', () => {
    vi.mocked(useTokenLogo).mockReturnValue(null)
    vi.mocked(muifyHtml).mockClear()
    
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    expect(muifyHtml).not.toHaveBeenCalled()
  })

  it('should be clickable when accounts are not empty', () => {
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    const overview = screen.getByTestId('app-row-overview')
    expect(overview).toHaveAttribute('tabIndex', '0')
    expect(overview).toHaveAttribute('role', 'button')
  })

  it('should not be clickable when accounts are empty', () => {
    render(<SynchronizedAppOverview {...defaultProps} accountCount={0} />)
    
    const overview = screen.getByTestId('app-row-overview')
    expect(overview).toHaveAttribute('tabIndex', '-1')
    expect(overview).not.toHaveClass('hover:bg-gray-50')
  })

  it('should toggle expansion on click', () => {
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    const overview = screen.getByTestId('app-row-overview')
    const chevron = overview.querySelector('.lucide-chevron-down')
    
    // Initially expanded
    expect(overview).toHaveAttribute('aria-expanded', 'true')
    expect(chevron).toHaveClass('rotate-180')
    
    // Click to collapse
    fireEvent.click(overview)
    expect(overview).toHaveAttribute('aria-expanded', 'false')
    expect(chevron).not.toHaveClass('rotate-180')
    
    // Click to expand again
    fireEvent.click(overview)
    expect(overview).toHaveAttribute('aria-expanded', 'true')
    expect(chevron).toHaveClass('rotate-180')
  })

  it('should handle Enter key to toggle expansion', () => {
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    const overview = screen.getByTestId('app-row-overview')
    
    // Initially expanded
    expect(overview).toHaveAttribute('aria-expanded', 'true')
    
    // Press Enter to collapse
    fireEvent.keyDown(overview, { key: 'Enter' })
    expect(overview).toHaveAttribute('aria-expanded', 'false')
  })

  it('should handle Space key to toggle expansion', () => {
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    const overview = screen.getByTestId('app-row-overview')
    
    // Initially expanded
    expect(overview).toHaveAttribute('aria-expanded', 'true')
    
    // Press Space to collapse
    fireEvent.keyDown(overview, { key: ' ' })
    expect(overview).toHaveAttribute('aria-expanded', 'false')
  })

  it('should not toggle on other keys', () => {
    render(<SynchronizedAppOverview {...defaultProps} />)
    
    const overview = screen.getByTestId('app-row-overview')
    
    // Initially expanded
    expect(overview).toHaveAttribute('aria-expanded', 'true')
    
    // Press other key - should not toggle
    fireEvent.keyDown(overview, { key: 'a' })
    expect(overview).toHaveAttribute('aria-expanded', 'true')
  })

  it('should not show chevron when account count is 0', () => {
    render(<SynchronizedAppOverview {...defaultProps} accountCount={0} />)
    
    const overview = screen.getByTestId('app-row-overview')
    const chevron = overview.querySelector('.lucide-chevron-down')
    expect(chevron).toBeNull()
  })

  it('should not respond to click when account count is 0', () => {
    render(<SynchronizedAppOverview {...defaultProps} accountCount={0} />)
    
    const overview = screen.getByTestId('app-row-overview')
    
    // Should remain expanded (default state) after click
    fireEvent.click(overview)
    expect(overview).toHaveAttribute('aria-expanded', 'true')
  })

  it('should not respond to keyboard events when account count is 0', () => {
    render(<SynchronizedAppOverview {...defaultProps} accountCount={0} />)
    
    const overview = screen.getByTestId('app-row-overview')
    
    // Should remain expanded (default state) after Enter
    fireEvent.keyDown(overview, { key: 'Enter' })
    expect(overview).toHaveAttribute('aria-expanded', 'true')
  })
})