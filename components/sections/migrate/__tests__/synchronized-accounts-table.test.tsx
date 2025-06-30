import { BN } from '@polkadot/util'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BalanceType } from '@/state/types/ledger'
import type { Address, MultisigAddress, NativeBalance } from '@/state/types/ledger'

// Mock dependencies
vi.mock('@legendapp/state/react', () => ({
  observer: (component: any) => component,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

vi.mock('@/components/ui/table', () => ({
  Table: ({ children, className }: any) => <table className={className}>{children}</table>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan, className }: any) => (
    <td colSpan={colSpan} className={className}>
      {children}
    </td>
  ),
  TableHead: ({ children, className }: any) => <th className={className}>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}))

vi.mock('../synchronized-account-row', () => ({
  default: ({ account, balance, rowSpan }: any) => (
    <tr data-testid="synchronized-account-row">
      <td>Account: {account.address}</td>
      <td>Balance Type: {balance?.type || 'error'}</td>
      <td>Row Span: {rowSpan}</td>
    </tr>
  ),
}))

import SynchronizedAccountsTable from '../synchronized-accounts-table'

describe('SynchronizedAccountsTable component', () => {
  const mockToken = {
    symbol: 'DOT',
    decimals: 10,
    name: 'Polkadot',
    category: 'substrate' as const,
    chainName: 'Polkadot',
  }

  const mockAddress: Address = {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    path: "m/44'/354'/0'/0/0",
    pubKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
    selected: false,
    balances: [
      {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          total: new BN('1000000000000'),
          transferable: new BN('500000000000'),
          free: new BN('900000000000'),
          reserved: { total: new BN('100000000000') },
          frozen: new BN('0'),
        },
      } as NativeBalance,
    ],
  }

  const mockMultisigAddress: MultisigAddress = {
    address: '5DTestAddress',
    selected: false,
    isMultisig: true,
    threshold: 2,
    members: [
      { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', internal: true },
      { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', internal: false },
    ],
    balances: [
      {
        id: 'native',
        type: BalanceType.NATIVE,
        balance: {
          total: new BN('2000000000000'),
          transferable: new BN('1500000000000'),
          free: new BN('1900000000000'),
          reserved: { total: new BN('100000000000') },
          frozen: new BN('0'),
        },
      } as NativeBalance,
    ],
  }

  const defaultProps = {
    accounts: [mockAddress],
    token: mockToken,
    polkadotAddresses: ['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'],
    appId: 'polkadot' as const,
    updateTransaction: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render table with standard headers', () => {
      render(<SynchronizedAccountsTable {...defaultProps} />)

      expect(screen.getByText('Source Address')).toBeInTheDocument()
      expect(screen.getByText('Destination Address')).toBeInTheDocument()
      expect(screen.getByText('Total Balance')).toBeInTheDocument()
      expect(screen.getByText('Transferable')).toBeInTheDocument()
      expect(screen.getByText('Staked')).toBeInTheDocument()
      expect(screen.getByText('Reserved')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('should render signatory address header for multisig accounts', () => {
      render(<SynchronizedAccountsTable {...defaultProps} isMultisig={true} />)

      expect(screen.getByText('Signatory Address')).toBeInTheDocument()
    })

    it('should render accounts with balances', () => {
      render(<SynchronizedAccountsTable {...defaultProps} />)

      const rows = screen.getAllByTestId('synchronized-account-row')
      expect(rows).toHaveLength(1)
      expect(screen.getByText('Account: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')).toBeInTheDocument()
      expect(screen.getByText('Balance Type: native')).toBeInTheDocument()
    })

    it('should render multiple balances for an account', () => {
      const accountWithMultipleBalances = {
        ...mockAddress,
        balances: [
          {
            id: 'native',
            type: BalanceType.NATIVE,
            balance: {
              total: new BN('1000000000000'),
              transferable: new BN('500000000000'),
              free: new BN('900000000000'),
              reserved: { total: new BN('100000000000') },
              frozen: new BN('0'),
            },
          } as NativeBalance,
          {
            id: 'nft',
            type: BalanceType.NFT,
            balance: [{ id: '1', name: 'Test NFT' }],
          },
        ],
      }

      render(<SynchronizedAccountsTable {...defaultProps} accounts={[accountWithMultipleBalances]} />)

      const rows = screen.getAllByTestId('synchronized-account-row')
      expect(rows).toHaveLength(2)
      expect(screen.getByText('Balance Type: native')).toBeInTheDocument()
      expect(screen.getByText('Balance Type: nft')).toBeInTheDocument()
    })

    it('should render empty state when no accounts', () => {
      render(<SynchronizedAccountsTable {...defaultProps} accounts={[]} />)

      expect(
        screen.getByText(/There are no accounts available for migration in this network/)
      ).toBeInTheDocument()
    })

    it('should handle undefined accounts', () => {
      render(<SynchronizedAccountsTable {...defaultProps} accounts={undefined} />)

      expect(
        screen.getByText(/There are no accounts available for migration in this network/)
      ).toBeInTheDocument()
    })
  })

  describe('error handling', () => {
    it('should render account with error even without balances', () => {
      const accountWithError = {
        ...mockAddress,
        balances: [],
        error: { source: 'synchronization', description: 'Failed to load balances' },
      }

      render(<SynchronizedAccountsTable {...defaultProps} accounts={[accountWithError]} />)

      const rows = screen.getAllByTestId('synchronized-account-row')
      expect(rows).toHaveLength(1)
      expect(screen.getByText('Balance Type: error')).toBeInTheDocument()
    })

    it('should render account with error and undefined balances', () => {
      const accountWithError = {
        ...mockAddress,
        balances: undefined,
        error: { source: 'synchronization', description: 'Failed to load balances' },
      }

      render(<SynchronizedAccountsTable {...defaultProps} accounts={[accountWithError]} />)

      const rows = screen.getAllByTestId('synchronized-account-row')
      expect(rows).toHaveLength(1)
      expect(screen.getByText('Balance Type: error')).toBeInTheDocument()
    })
  })

  describe('multisig accounts', () => {
    it('should render multisig accounts correctly', () => {
      render(<SynchronizedAccountsTable {...defaultProps} accounts={[mockMultisigAddress]} isMultisig={true} />)

      const rows = screen.getAllByTestId('synchronized-account-row')
      expect(rows).toHaveLength(1)
      expect(screen.getByText('Account: 5DTestAddress')).toBeInTheDocument()
    })

    it('should handle mixed regular and multisig accounts', () => {
      const accounts = [mockAddress, mockMultisigAddress]

      render(<SynchronizedAccountsTable {...defaultProps} accounts={accounts} />)

      const rows = screen.getAllByTestId('synchronized-account-row')
      expect(rows).toHaveLength(2)
      expect(screen.getByText('Account: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')).toBeInTheDocument()
      expect(screen.getByText('Account: 5DTestAddress')).toBeInTheDocument()
    })
  })

  describe('props passing', () => {
    it('should pass all required props to SynchronizedAccountRow', () => {
      const mockCollections = {
        nfts: new Map(),
        uniques: new Map(),
      }

      render(<SynchronizedAccountsTable {...defaultProps} collections={mockCollections} />)

      // Since we're mocking SynchronizedAccountRow, we can't directly test prop passing
      // but we verify the component is rendered with the correct data
      const rows = screen.getAllByTestId('synchronized-account-row')
      expect(rows).toHaveLength(1)
    })

    it('should calculate correct rowSpan for accounts with multiple balances', () => {
      const accountWithMultipleBalances = {
        ...mockAddress,
        balances: [
          {
            id: 'native',
            type: BalanceType.NATIVE,
            balance: {
              total: new BN('1000'),
              transferable: new BN('500'),
              free: new BN('900'),
              reserved: { total: new BN('100') },
              frozen: new BN('0'),
            },
          } as NativeBalance,
          {
            id: 'nft',
            type: BalanceType.NFT,
            balance: [],
          },
          {
            id: 'unique',
            type: BalanceType.UNIQUE,
            balance: [],
          },
        ],
      }

      render(<SynchronizedAccountsTable {...defaultProps} accounts={[accountWithMultipleBalances]} />)

      // All rows should have rowSpan of 3
      expect(screen.getAllByText('Row Span: 3')).toHaveLength(3)
    })
  })

  describe('animation', () => {
    it('should render with motion div wrapper', () => {
      const { container } = render(<SynchronizedAccountsTable {...defaultProps} />)

      // Since we're mocking framer-motion, we just verify the structure
      const motionDiv = container.firstChild as HTMLElement
      expect(motionDiv).toBeTruthy()
      expect(motionDiv.tagName).toBe('DIV')
      
      // Verify the table is inside the motion div
      const table = motionDiv.querySelector('table')
      expect(table).toBeTruthy()
      expect(table?.className).toBe('w-full')
    })
  })
})