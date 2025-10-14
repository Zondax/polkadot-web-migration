import { render, screen } from '@testing-library/react'
import type { AppDisplayInfo } from '@/lib/types/app-display'
import { AppStatus } from 'state/ledger'
import { describe, expect, it, vi } from 'vitest'
import AppScanningGrid from '../app-scanning-grid'

// Mock the dependencies
vi.mock('@legendapp/state/react', () => ({
  use$: vi.fn(() => ({
    polkadot: 'polkadot-icon-data',
    kusama: 'kusama-icon-data',
  })),
}))

vi.mock('state/ui', () => ({
  uiState$: {
    icons: {},
  },
}))

vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: ({ children, tooltipBody }: { children: React.ReactNode; tooltipBody: string }) => (
    <div data-testid="tooltip" title={tooltipBody}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/TokenIcon', () => ({
  default: ({ icon, symbol, size }: { icon: string; symbol: string; size: string }) => (
    <div data-testid="token-icon" data-icon={icon} data-symbol={symbol} data-size={size}>
      {symbol}
    </div>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: { children: React.ReactNode; variant?: string; className?: string }) => (
    <div data-testid="badge" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@/config/apps', () => ({
  polkadotAppConfig: {
    id: 'polkadot',
    name: 'Polkadot',
    token: { symbol: 'DOT', decimals: 10 },
    rpcEndpoints: ['wss://rpc.polkadot.io'],
  },
  getChainName: vi.fn((id: string) => {
    const names: Record<string, string> = {
      polkadot: 'Polkadot',
      kusama: 'Kusama',
      westend: 'Westend',
    }
    return names[id] || id
  }),
}))

vi.mock('@/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')),
}))

// Import mocked functions
import { cn } from '@/lib/utils'

const mockCn = cn as ReturnType<typeof vi.fn>

describe('AppScanningGrid', () => {
  describe('Grid Rendering', () => {
    it('should render grid with provided apps', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: undefined,
          totalAccounts: 0,
        },
        {
          id: 'kusama',
          name: 'Kusama',
          status: undefined,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByText('Polkadot')).toBeInTheDocument()
      expect(screen.getByText('Kusama')).toBeInTheDocument()
    })

    it('should render with correct grid classes', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: undefined,
          totalAccounts: 0,
        },
      ]

      const { container } = render(<AppScanningGrid apps={apps} />)
      const gridElement = container.querySelector('.grid')

      expect(gridElement).toHaveClass('grid-cols-3', 'sm:grid-cols-5', 'md:grid-cols-7', 'lg:grid-cols-10', 'xl:grid-cols-12')
    })

    it('should render empty grid when no apps provided', () => {
      const { container } = render(<AppScanningGrid apps={[]} />)
      const gridElement = container.querySelector('[data-testid="app-sync-grid"]')

      expect(gridElement).toBeInTheDocument()
      expect(gridElement?.children.length).toBe(0)
    })
  })

  describe('AppScanItem - Status Rendering', () => {
    it('should render app in default/waiting state', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: undefined,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTitle('Not synchronized')).toBeInTheDocument()
    })

    it('should render app in synchronized state with multiple accounts', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          totalAccounts: 2,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTitle('Ready to migrate (2 accounts)')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should render app in synchronized state with single account', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          totalAccounts: 1,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTitle('Ready to migrate (1 account)')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should render app in synchronized state without accounts', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTitle('No accounts with funds to migrate')).toBeInTheDocument()
    })

    it('should render app in migrated state', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.MIGRATED,
          totalAccounts: 1,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTitle('Ready to migrate (1 account)')).toBeInTheDocument()
    })

    it('should render app in error state', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.ERROR,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTitle('Failed synchronization')).toBeInTheDocument()
      const tokenIcons = screen.getAllByTestId('token-icon')
      expect(tokenIcons.length).toBeGreaterThan(0)
    })

    it('should render app in loading state', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.LOADING,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTitle('Synchronizing')).toBeInTheDocument()
    })

    it('should render app in rescanning state', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.RESCANNING,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTitle('Rescanning')).toBeInTheDocument()
    })
  })

  describe('App Display Properties', () => {
    it('should display app name', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Custom Polkadot Name',
          status: AppStatus.SYNCHRONIZED,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByText('Custom Polkadot Name')).toBeInTheDocument()
    })

    it('should render token icon with correct props', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: undefined,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      const tokenIcon = screen.getByTestId('token-icon')
      expect(tokenIcon).toHaveAttribute('data-icon', 'polkadot-icon-data')
      expect(tokenIcon).toHaveAttribute('data-symbol', 'Pol') // First 3 chars of Polkadot
      expect(tokenIcon).toHaveAttribute('data-size', 'md')
    })
  })

  describe('Badge Display Logic', () => {
    it('should display badge for synchronized apps with accounts', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          totalAccounts: 1,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByTestId('badge')).toBeInTheDocument()
    })

    it('should not display badge for rescanning apps', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.RESCANNING,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
    })

    it('should not display badge for apps with undefined status', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: undefined,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should apply correct classes for synchronized app with accounts', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          totalAccounts: 1,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(mockCn).toHaveBeenCalledWith(
        'flex flex-col items-center p-3 rounded-lg border transition-all',
        'border-green-200 bg-green-50 opacity-100'
      )
    })

    it('should apply correct classes for error app', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.ERROR,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(mockCn).toHaveBeenCalledWith(
        'flex flex-col items-center p-3 rounded-lg border transition-all',
        'border-red-200 bg-red-50 opacity-100'
      )
    })

    it('should apply correct classes for loading app', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.LOADING,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(mockCn).toHaveBeenCalledWith(
        'flex flex-col items-center p-3 rounded-lg border transition-all',
        'border-indigo-200 bg-indigo-50 opacity-100 animate-pulse'
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple apps with different states', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          totalAccounts: 2,
        },
        {
          id: 'kusama',
          name: 'Kusama',
          status: AppStatus.LOADING,
          totalAccounts: 0,
        },
        {
          id: 'westend',
          name: 'Westend',
          status: AppStatus.ERROR,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      expect(screen.getByText('Polkadot')).toBeInTheDocument()
      expect(screen.getByText('Kusama')).toBeInTheDocument()
      expect(screen.getByText('Westend')).toBeInTheDocument()
    })

    it('should handle apps with very long names', () => {
      const apps: AppDisplayInfo[] = [
        {
          id: 'polkadot',
          name: 'Very Very Very Very Very Long Blockchain Network Name That Should Be Truncated',
          status: AppStatus.SYNCHRONIZED,
          totalAccounts: 0,
        },
      ]

      render(<AppScanningGrid apps={apps} />)

      const nameElement = screen.getByText('Very Very Very Very Very Long Blockchain Network Name That Should Be Truncated')
      expect(nameElement).toHaveClass('truncate')
    })

    it('should render all apps in the provided array', () => {
      const apps: AppDisplayInfo[] = [
        { id: 'polkadot', name: 'Polkadot', status: undefined, totalAccounts: 0 },
        { id: 'kusama', name: 'Kusama', status: undefined, totalAccounts: 0 },
        { id: 'westend', name: 'Westend', status: undefined, totalAccounts: 0 },
      ]

      const { container } = render(<AppScanningGrid apps={apps} />)
      const gridElement = container.querySelector('[data-testid="app-sync-grid"]')

      expect(gridElement?.children.length).toBe(3)
    })
  })
})
