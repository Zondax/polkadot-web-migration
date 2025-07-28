import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { App } from '@/state/ledger'

// Mock dependencies
vi.mock('lucide-react', () => ({
  Info: ({ className }: any) => (
    <div data-testid="info-icon" className={className}>
      Info
    </div>
  ),
}))

vi.mock('@/components/CustomTooltip', () => ({
  CustomTooltip: ({ children, tooltipBody, className }: any) => (
    <div data-testid="custom-tooltip" data-tooltip-body={tooltipBody} className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, className }: any) => (
    <table data-testid="table" className={className}>
      {children}
    </table>
  ),
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableHead: ({ children, className }: any) => (
    <th data-testid="table-head" className={className}>
      {children}
    </th>
  ),
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
}))

vi.mock('../migrated-accounts-rows', () => ({
  default: ({ app, multisigAddresses }: any) => (
    <tr data-testid="migrated-account-row">
      <td>App: {app.name}</td>
      <td>ID: {app.id}</td>
      <td>Multisig: {multisigAddresses ? 'Yes' : 'No'}</td>
    </tr>
  ),
}))

import MigratedAccountsTable from '../migrated-accounts-table'

describe('MigratedAccountsTable component', () => {
  const mockApps: App[] = [
    {
      name: 'Polkadot',
      id: 'polkadot' as any,
      accounts: [],
      token: {
        symbol: 'DOT',
        decimals: 10,
      },
    },
    {
      name: 'Kusama',
      id: 'kusama' as any,
      accounts: [],
      token: {
        symbol: 'KSM',
        decimals: 12,
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('basic rendering', () => {
    it('should render table with correct structure', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      expect(screen.getByTestId('table')).toBeInTheDocument()
      expect(screen.getByTestId('table-header')).toBeInTheDocument()
      expect(screen.getByTestId('table-body')).toBeInTheDocument()
    })

    it('should render correct title for regular addresses', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      expect(screen.getByText('Regular Addresses')).toBeInTheDocument()
      expect(screen.queryByText('Multisig Addresses')).not.toBeInTheDocument()
    })

    it('should render correct title for multisig addresses', () => {
      render(<MigratedAccountsTable apps={mockApps} multisigAddresses destinationAddressesByApp={{}} />)

      expect(screen.getByText('Multisig Addresses')).toBeInTheDocument()
      expect(screen.queryByText('Regular Addresses')).not.toBeInTheDocument()
    })

    it('should apply correct styles to the table', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const table = screen.getByTestId('table')
      expect(table).toHaveClass('shadow-xs border border-gray-200')
    })

    it('should wrap table in a container with margin', () => {
      const { container } = render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('mb-8')
    })
  })

  describe('table headers', () => {
    it('should render correct headers for regular addresses', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const headers = screen.getAllByTestId('table-head')
      const headerTexts = headers.map(h => h.textContent)

      expect(headerTexts).toContain('Chain')
      expect(headerTexts).toContain('Source Address')
      expect(headerTexts).toContain('Public Key')
      expect(headerTexts).toContain('Destination Address')
      // The Balance header contains the tooltip and info icon
      expect(headerTexts.some(text => text?.includes('Balance'))).toBe(true)
      expect(headerTexts).toContain('Status')
    })

    it('should render correct headers for multisig addresses', () => {
      render(<MigratedAccountsTable apps={mockApps} multisigAddresses destinationAddressesByApp={{}} />)

      const headers = screen.getAllByTestId('table-head')
      const headerTexts = headers.map(h => h.textContent)

      expect(headerTexts).toContain('Chain')
      expect(headerTexts).toContain('Source Address')
      expect(headerTexts).toContain('Signatory Address')
      expect(headerTexts).toContain('Threshold')
      expect(headerTexts).toContain('Destination Address')
      // The Balance header contains the tooltip and info icon
      expect(headerTexts.some(text => text?.includes('Balance'))).toBe(true)
      expect(headerTexts).toContain('Status')
    })

    it('should not render Public Key header for multisig addresses', () => {
      render(<MigratedAccountsTable apps={mockApps} multisigAddresses destinationAddressesByApp={{}} />)

      const headers = screen.getAllByTestId('table-head')
      const headerTexts = headers.map(h => h.textContent)

      expect(headerTexts).not.toContain('Public Key')
    })

    it('should not render Signatory Address and Threshold headers for regular addresses', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const headers = screen.getAllByTestId('table-head')
      const headerTexts = headers.map(h => h.textContent)

      expect(headerTexts).not.toContain('Signatory Address')
      expect(headerTexts).not.toContain('Threshold')
    })

    it('should hide Chain header on small screens', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const headers = screen.getAllByTestId('table-head')
      const chainHeader = headers.find(h => h.textContent === 'Chain')

      expect(chainHeader).toHaveClass('hidden sm:table-cell')
    })
  })

  describe('balance header tooltip', () => {
    it('should render info icon with tooltip in balance header', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const infoIcon = screen.getByTestId('info-icon')
      expect(infoIcon).toBeInTheDocument()
      expect(infoIcon).toHaveClass('h-4 w-4 inline-block ml-1 text-gray-400')
    })

    it('should render tooltip with correct message', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const tooltip = screen.getByTestId('custom-tooltip')
      expect(tooltip).toHaveAttribute(
        'data-tooltip-body',
        'Balance to be transferred. The transaction fee will be deducted from this amount.'
      )
    })

    it('should apply correct styles to tooltip', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const tooltip = screen.getByTestId('custom-tooltip')
      expect(tooltip).toHaveClass('normal-case! font-normal')
    })

    it('should use flex layout for balance header', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const headers = screen.getAllByTestId('table-head')
      const balanceHeader = headers.find(h => h.textContent?.includes('Balance'))

      expect(balanceHeader).toHaveClass('flex items-center')
    })
  })

  describe('rows rendering', () => {
    it('should render a row for each app', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const rows = screen.getAllByTestId('migrated-account-row')
      expect(rows).toHaveLength(2)
    })

    it('should pass correct props to MigratedAccountRows for regular addresses', () => {
      render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      const rows = screen.getAllByTestId('migrated-account-row')
      expect(rows[0]).toHaveTextContent('App: Polkadot')
      expect(rows[0]).toHaveTextContent('ID: polkadot')
      expect(rows[0]).toHaveTextContent('Multisig: No')
      expect(rows[1]).toHaveTextContent('App: Kusama')
      expect(rows[1]).toHaveTextContent('ID: kusama')
      expect(rows[1]).toHaveTextContent('Multisig: No')
    })

    it('should pass correct props to MigratedAccountRows for multisig addresses', () => {
      render(<MigratedAccountsTable apps={mockApps} multisigAddresses destinationAddressesByApp={{}} />)

      const rows = screen.getAllByTestId('migrated-account-row')
      expect(rows[0]).toHaveTextContent('Multisig: Yes')
      expect(rows[1]).toHaveTextContent('Multisig: Yes')
    })

    it('should use app.id as key for each row', () => {
      const { rerender } = render(<MigratedAccountsTable apps={mockApps} destinationAddressesByApp={{}} />)

      // Add a new app
      const newApps = [
        ...mockApps,
        {
          name: 'Westend',
          id: 'westend' as any,
          accounts: [],
          token: {
            symbol: 'WND',
            decimals: 12,
          },
        },
      ]

      rerender(<MigratedAccountsTable apps={newApps} destinationAddressesByApp={{}} />)

      const rows = screen.getAllByTestId('migrated-account-row')
      expect(rows).toHaveLength(3)
      expect(rows[2]).toHaveTextContent('App: Westend')
    })
  })

  describe('edge cases', () => {
    it('should render empty table body when apps array is empty', () => {
      render(<MigratedAccountsTable apps={[]} destinationAddressesByApp={{}} />)

      const tableBody = screen.getByTestId('table-body')
      expect(tableBody).toBeInTheDocument()
      expect(tableBody.children).toHaveLength(0)
    })

    it('should handle app with undefined id', () => {
      const appsWithUndefinedId: App[] = [
        {
          name: 'Test App',
          id: undefined as any,
          accounts: [],
          token: {
            symbol: 'TEST',
            decimals: 10,
          },
        },
      ]

      render(<MigratedAccountsTable apps={appsWithUndefinedId} destinationAddressesByApp={{}} />)

      const rows = screen.getAllByTestId('migrated-account-row')
      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveTextContent('App: Test App')
    })

    it('should handle app with number id', () => {
      const appsWithNumberId: App[] = [
        {
          name: 'Test App',
          id: 123 as any,
          accounts: [],
          token: {
            symbol: 'TEST',
            decimals: 10,
          },
        },
      ]

      render(<MigratedAccountsTable apps={appsWithNumberId} destinationAddressesByApp={{}} />)

      const rows = screen.getAllByTestId('migrated-account-row')
      expect(rows).toHaveLength(1)
      expect(rows[0]).toHaveTextContent('ID: 123')
    })
  })
})
