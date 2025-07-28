import { render, screen } from '@testing-library/react'
import { type App, AppStatus } from 'state/ledger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AppScanningGrid from '../app-scanning-grid'

// Mock the dependencies
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
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

vi.mock('@/components/hooks/useSynchronization', () => ({
  useSynchronization: vi.fn(),
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
  appsConfigs: new Map([
    [
      'polkadot',
      {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        rpcEndpoint: 'wss://rpc.polkadot.io',
      },
    ],
    [
      'kusama',
      {
        id: 'kusama',
        name: 'Kusama',
        token: { symbol: 'KSM', decimals: 12 },
        rpcEndpoint: 'wss://kusama-rpc.polkadot.io',
      },
    ],
    [
      'westend',
      {
        id: 'westend',
        name: 'Westend',
        token: { symbol: 'WND', decimals: 12 },
        // No rpcEndpoint - should be filtered out
      },
    ],
  ]),
  polkadotAppConfig: {
    id: 'polkadot',
    name: 'Polkadot',
    token: { symbol: 'DOT', decimals: 10 },
    rpcEndpoint: 'wss://rpc.polkadot.io',
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
  getAppTotalAccounts: vi.fn((app: App) => {
    if (app.accounts) {
      return app.accounts.length
    }
    return 0
  }),
  hasAppAccounts: vi.fn((app: App) => {
    if (app.accounts) {
      return app.accounts.length > 0
    }
    return false
  }),
}))

// Import mocked functions
import { useSynchronization } from '@/components/hooks/useSynchronization'
import { getChainName } from '@/config/apps'
import { cn, getAppTotalAccounts, hasAppAccounts } from '@/lib/utils'

const mockUseSynchronization = useSynchronization as ReturnType<typeof vi.fn>
const mockGetChainName = getChainName as ReturnType<typeof vi.fn>
const mockCn = cn as ReturnType<typeof vi.fn>
const mockGetAppTotalAccounts = getAppTotalAccounts as ReturnType<typeof vi.fn>
const mockHasAppAccounts = hasAppAccounts as ReturnType<typeof vi.fn>

describe('AppScanningGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockUseSynchronization.mockReturnValue({
      apps: [],
    })
    mockGetChainName.mockImplementation((id: string) => {
      const names: Record<string, string> = {
        polkadot: 'Polkadot',
        kusama: 'Kusama',
        westend: 'Westend',
      }
      return names[id] || id
    })
    mockCn.mockImplementation((...classes) => classes.filter(Boolean).join(' '))
  })

  describe('Grid Rendering', () => {
    it('should render grid with all apps that have RPC endpoints', () => {
      mockUseSynchronization.mockReturnValue({
        apps: [],
      })

      render(<AppScanningGrid />)

      // Should render polkadot and kusama (have RPC endpoints) but not westend (no RPC endpoint)
      expect(screen.getByText('Polkadot')).toBeInTheDocument()
      expect(screen.getByText('Kusama')).toBeInTheDocument()
      expect(screen.queryByText('Westend')).not.toBeInTheDocument()
    })

    it('should render with correct grid classes', () => {
      mockUseSynchronization.mockReturnValue({
        apps: [],
      })

      const { container } = render(<AppScanningGrid />)
      const gridElement = container.querySelector('.grid')

      expect(gridElement).toHaveClass('grid-cols-3', 'sm:grid-cols-5', 'md:grid-cols-7', 'lg:grid-cols-10', 'xl:grid-cols-12')
    })
  })

  describe('AppScanItem - Status Rendering', () => {
    it('should render app in default/waiting state', () => {
      mockUseSynchronization.mockReturnValue({
        apps: [],
      })
      mockGetAppTotalAccounts.mockReturnValue(0)
      mockHasAppAccounts.mockReturnValue(false)

      render(<AppScanningGrid />)

      const tooltips = screen.getAllByTitle('Not synchronized')
      expect(tooltips).toHaveLength(2) // Polkadot and Kusama both have this status
      expect(tooltips[0]).toBeInTheDocument()
    })

    it('should render app in synchronized state with accounts', () => {
      const synchronizedApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
        accounts: [
          { address: 'address1', balances: [] },
          { address: 'address2', balances: [] },
        ],
      }

      mockUseSynchronization.mockReturnValue({
        apps: [synchronizedApp],
      })
      mockGetAppTotalAccounts.mockReturnValue(2)
      mockHasAppAccounts.mockReturnValue(true)

      render(<AppScanningGrid />)

      expect(screen.getByTitle('Ready to migrate (2 accounts)')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should render app in synchronized state with single account', () => {
      const synchronizedApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
        accounts: [{ address: 'address1', balances: [] }],
      }

      mockUseSynchronization.mockReturnValue({
        apps: [synchronizedApp],
      })
      mockGetAppTotalAccounts.mockReturnValue(1)
      mockHasAppAccounts.mockReturnValue(true)

      render(<AppScanningGrid />)

      expect(screen.getByTitle('Ready to migrate (1 account)')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('should render app in synchronized state without accounts', () => {
      const synchronizedApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
        accounts: [],
      }

      mockUseSynchronization.mockReturnValue({
        apps: [synchronizedApp],
      })
      mockGetAppTotalAccounts.mockReturnValue(0)
      mockHasAppAccounts.mockReturnValue(false)

      render(<AppScanningGrid />)

      expect(screen.getByTitle('No accounts with funds to migrate')).toBeInTheDocument()
    })

    it('should render app in migrated state', () => {
      const migratedApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.MIGRATED,
        accounts: [{ address: 'address1', balances: [] }],
      }

      mockUseSynchronization.mockReturnValue({
        apps: [migratedApp],
      })
      mockGetAppTotalAccounts.mockReturnValue(1)
      mockHasAppAccounts.mockReturnValue(true)

      render(<AppScanningGrid />)

      expect(screen.getByTitle('Ready to migrate (1 account)')).toBeInTheDocument()
    })

    it('should render app in error state', () => {
      const errorApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.ERROR,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [errorApp],
      })

      render(<AppScanningGrid />)

      expect(screen.getByTitle('Failed synchronization')).toBeInTheDocument()
      const tokenIcons = screen.getAllByTestId('token-icon')
      expect(tokenIcons.length).toBeGreaterThan(0)
    })

    it('should render app in loading state', () => {
      const loadingApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.LOADING,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [loadingApp],
      })

      render(<AppScanningGrid />)

      expect(screen.getByTitle('Synchronizing')).toBeInTheDocument()
    })

    it('should render app in rescanning state', () => {
      const rescanningApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.RESCANNING,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [rescanningApp],
      })

      render(<AppScanningGrid />)

      expect(screen.getByTitle('Rescanning')).toBeInTheDocument()
    })
  })

  describe('App Display Properties', () => {
    it('should use app name when available', () => {
      const appWithName: App = {
        id: 'polkadot',
        name: 'Custom Polkadot Name',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [appWithName],
      })

      render(<AppScanningGrid />)

      expect(screen.getByText('Custom Polkadot Name')).toBeInTheDocument()
    })

    it('should fallback to chain name when app name is not available', () => {
      const appWithoutName: App = {
        id: 'polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [appWithoutName],
      })
      mockGetChainName.mockReturnValue('Polkadot Chain')

      render(<AppScanningGrid />)

      expect(screen.getByText('Polkadot Chain')).toBeInTheDocument()
      expect(mockGetChainName).toHaveBeenCalledWith('polkadot')
    })

    it('should fallback to app id when neither name nor chain name available', () => {
      const appWithoutName: App = {
        id: 'polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [appWithoutName],
      })
      mockGetChainName.mockReturnValue('')

      render(<AppScanningGrid />)

      expect(screen.getByText('polkadot')).toBeInTheDocument()
    })

    it('should render token icon with correct props', () => {
      mockUseSynchronization.mockReturnValue({
        apps: [],
      })

      render(<AppScanningGrid />)

      const tokenIcon = screen.getAllByTestId('token-icon')[0]
      expect(tokenIcon).toHaveAttribute('data-icon', 'polkadot-icon-data')
      expect(tokenIcon).toHaveAttribute('data-symbol', 'Pol') // First 3 chars of Polkadot
      expect(tokenIcon).toHaveAttribute('data-size', 'md')
    })
  })

  describe('Badge Display Logic', () => {
    it('should display badge for synchronized apps', () => {
      const synchronizedApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
        accounts: [{ address: 'addr1', balances: [] }],
      }

      mockUseSynchronization.mockReturnValue({
        apps: [synchronizedApp],
      })
      mockGetAppTotalAccounts.mockReturnValue(1)
      mockHasAppAccounts.mockReturnValue(true)

      render(<AppScanningGrid />)

      expect(screen.getByTestId('badge')).toBeInTheDocument()
    })

    it('should not display badge for rescanning apps', () => {
      const rescanningApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.RESCANNING,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [rescanningApp],
      })

      render(<AppScanningGrid />)

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
    })

    it('should not display badge for apps with undefined status', () => {
      mockUseSynchronization.mockReturnValue({
        apps: [],
      })

      render(<AppScanningGrid />)

      // Apps with undefined status should not have badges visible
      // The component still renders the apps, but without badges
      expect(screen.getByText('Polkadot')).toBeInTheDocument()
      expect(screen.getByText('Kusama')).toBeInTheDocument()
      expect(screen.queryByTestId('badge')).not.toBeInTheDocument()
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should apply correct classes for synchronized app with accounts', () => {
      const synchronizedApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
        accounts: [{ address: 'addr1', balances: [] }],
      }

      mockUseSynchronization.mockReturnValue({
        apps: [synchronizedApp],
      })
      mockGetAppTotalAccounts.mockReturnValue(1)
      mockHasAppAccounts.mockReturnValue(true)

      render(<AppScanningGrid />)

      expect(mockCn).toHaveBeenCalledWith(
        'flex flex-col items-center p-3 rounded-lg border transition-all',
        'border-green-200 bg-green-50 opacity-100'
      )
    })

    it('should apply correct classes for error app', () => {
      const errorApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.ERROR,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [errorApp],
      })

      render(<AppScanningGrid />)

      expect(mockCn).toHaveBeenCalledWith(
        'flex flex-col items-center p-3 rounded-lg border transition-all',
        'border-red-200 bg-red-50 opacity-100'
      )
    })

    it('should apply correct classes for loading app', () => {
      const loadingApp: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.LOADING,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [loadingApp],
      })

      render(<AppScanningGrid />)

      expect(mockCn).toHaveBeenCalledWith(
        'flex flex-col items-center p-3 rounded-lg border transition-all',
        'border-indigo-200 bg-indigo-50 opacity-100 animate-pulse'
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle apps with null or undefined accounts', () => {
      const appWithNullAccounts: App = {
        id: 'polkadot',
        name: 'Polkadot',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
        accounts: undefined,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [appWithNullAccounts],
      })
      mockGetAppTotalAccounts.mockReturnValue(0)
      mockHasAppAccounts.mockReturnValue(false)

      render(<AppScanningGrid />)

      expect(screen.getByTitle('No accounts with funds to migrate')).toBeInTheDocument()
    })

    it('should handle empty apps array from synchronization', () => {
      mockUseSynchronization.mockReturnValue({
        apps: [],
      })

      render(<AppScanningGrid />)

      // Should still show config apps with undefined status
      expect(screen.getByText('Polkadot')).toBeInTheDocument()
      expect(screen.getByText('Kusama')).toBeInTheDocument()
    })

    it('should handle apps with very long names', () => {
      const appWithLongName: App = {
        id: 'polkadot',
        name: 'Very Very Very Very Very Long Blockchain Network Name That Should Be Truncated',
        token: { symbol: 'DOT', decimals: 10 },
        status: AppStatus.SYNCHRONIZED,
      }

      mockUseSynchronization.mockReturnValue({
        apps: [appWithLongName],
      })

      render(<AppScanningGrid />)

      const nameElement = screen.getByText('Very Very Very Very Very Long Blockchain Network Name That Should Be Truncated')
      expect(nameElement).toHaveClass('truncate')
    })
  })
})
