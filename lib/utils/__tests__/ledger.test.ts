import { BN } from '@polkadot/util'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppStatus } from '@/state/ledger'
import {
  type Address,
  type AddressBalance,
  type AddressWithVerificationStatus,
  BalanceType,
  type MultisigAddress,
  type NativeBalance,
  VerificationStatus,
} from '@/state/types/ledger'
import type { App } from '@/state/ledger'

import {
  addDestinationAddressesFromAccounts,
  filterAccountsForApps,
  filterInvalidSyncedApps,
  filterSelectedAccountsForMigration,
  filterValidSyncedAppsWithBalances,
  getAppLightIcon,
  getAppTotalAccounts,
  hasAccountsWithErrors,
  hasAppAccounts,
  setDefaultDestinationAddress,
} from '../ledger'

// Mock axios
vi.mock('axios')

// Mock fetch
global.fetch = vi.fn()

// Mock balance utilities
vi.mock('../balance', () => ({
  hasAddressBalance: vi.fn((account) => {
    if (!account.balances) return false
    return account.balances.some((balance: any) => {
      if (balance.type === BalanceType.NATIVE) {
        return balance.balance?.total?.gt(new BN(0))
      }
      return balance.balance?.length > 0
    })
  }),
  hasBalance: vi.fn((balances) => {
    return balances.some((balance: any) => {
      if (balance.type === BalanceType.NATIVE) {
        return balance.balance?.total?.gt(new BN(0))
      }
      return balance.balance?.length > 0
    })
  }),
}))

describe('ledger utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_HUB_BACKEND_URL', 'https://api.example.com')
  })

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

  const mockApp: App = {
    id: 'polkadot',
    name: 'Polkadot',
    icon: 'polkadot-icon',
    status: AppStatus.READY,
    accounts: [mockAddress],
    multisigAccounts: [mockMultisigAddress],
  }

  describe('getAppLightIcon', () => {
    it('should fetch icon from API successfully', async () => {
      const mockIconData = '<svg>icon</svg>'
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockIconData })

      const result = await getAppLightIcon('polkadot')

      expect(result).toEqual({ data: mockIconData, error: undefined })
      expect(axios.get).toHaveBeenCalledWith('https://api.example.com/app/polkadot/icon/light')
    })

    it('should fall back to local image when API fails', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('API error'))
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => '<svg>local icon</svg>',
      } as Response)

      const result = await getAppLightIcon('polkadot')

      expect(result).toEqual({ data: '<svg>local icon</svg>', error: undefined })
      expect(global.fetch).toHaveBeenCalledWith('/logos/chains/polkadot.svg')
    })

    it('should return error when both API and local fetch fail', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('API error'))
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
      } as Response)

      const result = await getAppLightIcon('polkadot')

      expect(result).toEqual({ data: undefined, error: 'Icon not found' })
    })

    it('should return error when hub URL is not configured', async () => {
      vi.stubEnv('NEXT_PUBLIC_HUB_BACKEND_URL', '')

      const result = await getAppLightIcon('polkadot')

      expect(result).toEqual({ data: undefined, error: 'Hub URL not configured' })
    })

    it('should handle axios errors and fall back to local', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('API error'))
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Local fetch error'))

      const result = await getAppLightIcon('polkadot')

      expect(result).toEqual({ data: undefined, error: 'Icon not found' })
    })
  })

  describe('filterValidSyncedAppsWithBalances', () => {
    it('should filter apps with valid synced accounts that have balances', () => {
      const apps: App[] = [
        mockApp,
        {
          ...mockApp,
          id: 'kusama',
          accounts: [
            {
              ...mockAddress,
              balances: [],
            },
          ],
          multisigAccounts: [],
        },
      ]

      const result = filterValidSyncedAppsWithBalances(apps)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('polkadot')
    })

    it('should include accounts with migration errors', () => {
      const appsWithErrors: App[] = [
        {
          ...mockApp,
          accounts: [
            {
              ...mockAddress,
              error: { source: 'migration', description: 'Migration error' },
            },
          ],
        },
      ]

      const result = filterValidSyncedAppsWithBalances(appsWithErrors)

      expect(result).toHaveLength(1)
      expect(result[0].accounts).toHaveLength(1)
    })

    it('should exclude accounts with synchronization errors', () => {
      const appsWithErrors: App[] = [
        {
          ...mockApp,
          accounts: [
            {
              ...mockAddress,
              error: { source: 'synchronization', description: 'Sync error' },
            },
          ],
          multisigAccounts: [],
        },
      ]

      const result = filterValidSyncedAppsWithBalances(appsWithErrors)

      expect(result).toHaveLength(0)
    })

    it('should handle apps without accounts gracefully', () => {
      const appsWithoutAccounts: App[] = [
        {
          ...mockApp,
          accounts: undefined,
          multisigAccounts: undefined,
        },
      ]

      const result = filterValidSyncedAppsWithBalances(appsWithoutAccounts)

      expect(result).toHaveLength(0)
    })
  })

  describe('filterSelectedAccountsForMigration', () => {
    it('should filter only selected accounts', () => {
      const apps: App[] = [
        {
          ...mockApp,
          accounts: [
            { ...mockAddress, selected: true },
            { ...mockAddress, selected: false },
          ],
          multisigAccounts: [
            { ...mockMultisigAddress, selected: true },
            { ...mockMultisigAddress, selected: false },
          ],
        },
      ]

      const result = filterSelectedAccountsForMigration(apps)

      expect(result).toHaveLength(1)
      expect(result[0].accounts).toHaveLength(1)
      expect(result[0].multisigAccounts).toHaveLength(1)
      expect(result[0].accounts[0].selected).toBe(true)
      expect(result[0].multisigAccounts[0].selected).toBe(true)
    })

    it('should exclude apps with no selected accounts', () => {
      const apps: App[] = [
        {
          ...mockApp,
          accounts: [{ ...mockAddress, selected: false }],
          multisigAccounts: [{ ...mockMultisigAddress, selected: false }],
        },
      ]

      const result = filterSelectedAccountsForMigration(apps)

      expect(result).toHaveLength(0)
    })
  })

  describe('filterInvalidSyncedApps', () => {
    it('should filter apps with accounts having non-migration errors', () => {
      const apps: App[] = [
        {
          ...mockApp,
          accounts: [
            {
              ...mockAddress,
              error: { source: 'synchronization', description: 'Sync error' },
            },
          ],
        },
      ]

      const result = filterInvalidSyncedApps(apps)

      expect(result).toHaveLength(1)
      expect(result[0].accounts).toHaveLength(1)
    })

    it('should exclude accounts with migration errors', () => {
      const apps: App[] = [
        {
          ...mockApp,
          accounts: [
            {
              ...mockAddress,
              error: { source: 'migration', description: 'Migration error' },
            },
          ],
          multisigAccounts: [],
        },
      ]

      const result = filterInvalidSyncedApps(apps)

      expect(result).toHaveLength(0)
    })

    it('should include apps with error status', () => {
      const apps: App[] = [
        {
          ...mockApp,
          status: 'error' as AppStatus,
          accounts: [],
          multisigAccounts: [],
        },
      ]

      const result = filterInvalidSyncedApps(apps)

      expect(result).toHaveLength(1)
    })
  })

  describe('hasAccountsWithErrors', () => {
    it('should return true when app has synchronization error', () => {
      const apps: App[] = [
        {
          ...mockApp,
          error: { source: 'synchronization', description: 'Sync error' },
        },
      ]

      const result = hasAccountsWithErrors(apps)

      expect(result).toBe(true)
    })

    it('should return true when app is rescanning', () => {
      const apps: App[] = [
        {
          ...mockApp,
          status: AppStatus.RESCANNING,
        },
      ]

      const result = hasAccountsWithErrors(apps)

      expect(result).toBe(true)
    })

    it('should return true when accounts have non-migration errors', () => {
      const apps: App[] = [
        {
          ...mockApp,
          accounts: [
            {
              ...mockAddress,
              error: { source: 'ledger', description: 'Ledger error' },
            },
          ],
        },
      ]

      const result = hasAccountsWithErrors(apps)

      expect(result).toBe(true)
    })

    it('should return false when all accounts are valid or have migration errors only', () => {
      const apps: App[] = [
        {
          ...mockApp,
          accounts: [
            mockAddress,
            {
              ...mockAddress,
              error: { source: 'migration', description: 'Migration error' },
            },
          ],
        },
      ]

      const result = hasAccountsWithErrors(apps)

      expect(result).toBe(false)
    })
  })

  describe('hasAppAccounts', () => {
    it('should return true when app has regular accounts', () => {
      const app: App = {
        ...mockApp,
        accounts: [mockAddress],
        multisigAccounts: [],
      }

      const result = hasAppAccounts(app)

      expect(result).toBe(true)
    })

    it('should return true when app has multisig accounts', () => {
      const app: App = {
        ...mockApp,
        accounts: [],
        multisigAccounts: [mockMultisigAddress],
      }

      const result = hasAppAccounts(app)

      expect(result).toBe(true)
    })

    it('should return false when app has no accounts', () => {
      const app: App = {
        ...mockApp,
        accounts: [],
        multisigAccounts: [],
      }

      const result = hasAppAccounts(app)

      expect(result).toBe(false)
    })

    it('should return false when accounts are undefined', () => {
      const app: App = {
        ...mockApp,
        accounts: undefined,
        multisigAccounts: undefined,
      }

      const result = hasAppAccounts(app)

      expect(result).toBe(false)
    })
  })

  describe('getAppTotalAccounts', () => {
    it('should return total count of all accounts', () => {
      const app: App = {
        ...mockApp,
        accounts: [mockAddress, mockAddress],
        multisigAccounts: [mockMultisigAddress],
      }

      const result = getAppTotalAccounts(app)

      expect(result).toBe(3)
    })

    it('should handle undefined accounts', () => {
      const app: App = {
        ...mockApp,
        accounts: undefined,
        multisigAccounts: undefined,
      }

      const result = getAppTotalAccounts(app)

      expect(result).toBe(0)
    })
  })

  describe('filterAccountsForApps', () => {
    it('should include all accounts when filterByBalance is false', () => {
      const accounts = [
        mockAddress,
        { ...mockAddress, balances: [] },
      ]

      const result = filterAccountsForApps(accounts, false)

      expect(result).toHaveLength(2)
    })

    it('should filter accounts with balances when filterByBalance is true', () => {
      const accounts = [
        mockAddress,
        { ...mockAddress, balances: [] },
      ]

      const result = filterAccountsForApps(accounts, true)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(mockAddress)
    })

    it('should include accounts with errors regardless of balance', () => {
      const accounts = [
        {
          ...mockAddress,
          balances: [],
          error: { source: 'synchronization', description: 'Error' },
        },
      ]

      const result = filterAccountsForApps(accounts, true)

      expect(result).toHaveLength(1)
    })

    it('should include accounts that are members of multisigs', () => {
      const accounts = [
        {
          ...mockAddress,
          balances: [],
          memberMultisigAddresses: ['5DTestMultisig'],
        },
      ]

      const result = filterAccountsForApps(accounts, true)

      expect(result).toHaveLength(1)
    })
  })

  describe('setDefaultDestinationAddress', () => {
    it('should set destination address for balances without one', () => {
      const account = {
        ...mockAddress,
        balances: [
          {
            ...mockAddress.balances![0],
            transaction: { destinationAddress: '' },
          },
        ] as AddressBalance[],
      }

      const result = setDefaultDestinationAddress(account, '5GNewAddress')

      expect(result.balances?.[0].transaction?.destinationAddress).toBe('5GNewAddress')
    })

    it('should not override existing destination addresses', () => {
      const account = {
        ...mockAddress,
        balances: [
          {
            ...mockAddress.balances![0],
            transaction: { destinationAddress: '5GExistingAddress' },
          },
        ] as AddressBalance[],
      }

      const result = setDefaultDestinationAddress(account, '5GNewAddress')

      expect(result.balances?.[0].transaction?.destinationAddress).toBe('5GExistingAddress')
    })

    it('should handle accounts without balances', () => {
      const account = {
        ...mockAddress,
        balances: undefined,
      }

      const result = setDefaultDestinationAddress(account, '5GNewAddress')

      expect(result).toEqual(account)
    })

    it('should handle balances without transactions', () => {
      const account = {
        ...mockAddress,
        balances: [
          {
            ...mockAddress.balances![0],
            transaction: undefined,
          },
        ] as AddressBalance[],
      }

      const result = setDefaultDestinationAddress(account, '5GNewAddress')

      expect(result.balances?.[0].transaction?.destinationAddress).toBe('5GNewAddress')
    })
  })

  describe('addDestinationAddressesFromAccounts', () => {
    it('should add unique destination addresses to the map', () => {
      const addressMap = new Map<string, AddressWithVerificationStatus>()
      const accounts = [
        {
          ...mockAddress,
          balances: [
            {
              ...mockAddress.balances![0],
              transaction: { destinationAddress: '5GAddress1' },
            },
            {
              ...mockAddress.balances![0],
              transaction: { destinationAddress: '5GAddress2' },
            },
          ] as AddressBalance[],
        },
      ]

      addDestinationAddressesFromAccounts(accounts, addressMap)

      expect(addressMap.size).toBe(2)
      expect(addressMap.get('5GAddress1')).toEqual({
        address: '5GAddress1',
        path: mockAddress.path,
        status: VerificationStatus.PENDING,
      })
    })

    it('should not add duplicate addresses', () => {
      const addressMap = new Map<string, AddressWithVerificationStatus>()
      addressMap.set('5GAddress1', {
        address: '5GAddress1',
        path: 'existing/path',
        status: VerificationStatus.VERIFIED,
      })

      const accounts = [
        {
          ...mockAddress,
          balances: [
            {
              ...mockAddress.balances![0],
              transaction: { destinationAddress: '5GAddress1' },
            },
          ] as AddressBalance[],
        },
      ]

      addDestinationAddressesFromAccounts(accounts, addressMap)

      expect(addressMap.size).toBe(1)
      expect(addressMap.get('5GAddress1')?.path).toBe('existing/path')
    })

    it('should handle undefined accounts', () => {
      const addressMap = new Map<string, AddressWithVerificationStatus>()

      addDestinationAddressesFromAccounts(undefined, addressMap)

      expect(addressMap.size).toBe(0)
    })

    it('should skip balances without destination addresses', () => {
      const addressMap = new Map<string, AddressWithVerificationStatus>()
      const accounts = [
        {
          ...mockAddress,
          balances: [
            {
              ...mockAddress.balances![0],
              transaction: { destinationAddress: '' },
            },
          ] as AddressBalance[],
        },
      ]

      addDestinationAddressesFromAccounts(accounts, addressMap)

      expect(addressMap.size).toBe(0)
    })
  })
})