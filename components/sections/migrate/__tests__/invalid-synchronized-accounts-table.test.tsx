import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InvalidSynchronizedAccountsTable from '../invalid-synchronized-accounts-table'

// Mock the dependencies
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

vi.mock('../invalid-synchronized-account-row', () => ({
  default: ({ account, accountIndex }: any) => (
    <tr data-testid={`account-row-${accountIndex}`}>
      <td>{account.address}</td>
      <td>Error</td>
    </tr>
  ),
}))

describe('InvalidSynchronizedAccountsTable', () => {
  const mockProps = {
    token: { symbol: 'DOT', decimals: 10 },
    polkadotAddresses: ['5Address1', '5Address2'],
    appId: 'polkadot' as const,
    updateTransaction: vi.fn(),
    isMultisig: false,
  }

  it('should render empty state when no accounts provided', () => {
    render(<InvalidSynchronizedAccountsTable {...mockProps} accounts={undefined} />)

    expect(screen.getByText(/There are no accounts available for migration/)).toBeInTheDocument()
  })

  it('should render empty state when accounts array is empty', () => {
    render(<InvalidSynchronizedAccountsTable {...mockProps} accounts={[]} />)

    expect(screen.getByText(/There are no accounts available for migration/)).toBeInTheDocument()
  })

  it('should render account rows when accounts are provided', () => {
    const mockAccounts = [
      { address: '5Address1', error: { description: 'Error 1' } },
      { address: '5Address2', error: { description: 'Error 2' } },
    ]

    render(<InvalidSynchronizedAccountsTable {...mockProps} accounts={mockAccounts} />)

    expect(screen.getByTestId('account-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('account-row-1')).toBeInTheDocument()
    expect(screen.getByText('5Address1')).toBeInTheDocument()
    expect(screen.getByText('5Address2')).toBeInTheDocument()
  })

  it('should render table headers', () => {
    render(<InvalidSynchronizedAccountsTable {...mockProps} accounts={[]} />)

    expect(screen.getByText('Source Address')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('should handle single account', () => {
    const mockAccounts = [{ address: '5SingleAddress', error: { description: 'Single error' } }]

    render(<InvalidSynchronizedAccountsTable {...mockProps} accounts={mockAccounts} />)

    expect(screen.getByTestId('account-row-0')).toBeInTheDocument()
    expect(screen.getByText('5SingleAddress')).toBeInTheDocument()
  })

  it('should render with collections prop', () => {
    const mockAccounts = [{ address: '5Address1', error: { description: 'Error 1' } }]
    const mockCollections = { nfts: [] }

    render(<InvalidSynchronizedAccountsTable {...mockProps} accounts={mockAccounts} collections={mockCollections} />)

    expect(screen.getByTestId('account-row-0')).toBeInTheDocument()
  })

  it('should render with isMultisig prop', () => {
    const mockAccounts = [{ address: '5MultisigAddress', members: [], threshold: 2 }]

    render(<InvalidSynchronizedAccountsTable {...mockProps} accounts={mockAccounts} isMultisig={true} />)

    expect(screen.getByTestId('account-row-0')).toBeInTheDocument()
  })
})
