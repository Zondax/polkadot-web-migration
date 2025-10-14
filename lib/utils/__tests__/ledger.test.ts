import type { App } from '@/state/ledger'
import { AppStatus } from '@/state/ledger'
import {
  BalanceType,
  VerificationStatus,
  type Address,
  type AddressBalance,
  type AddressWithVerificationStatus,
  type MultisigAddress,
  type NativeBalance,
} from '@/state/types/ledger'
import { BN } from '@polkadot/util'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addDestinationAddressesFromAccounts,
  filterAccountsForApps,
  filterInvalidSyncedApps,
  filterValidSelectedAccountsForMigration,
  filterValidSyncedAppsWithBalances,
  getAppLightIcon,
  getAppTotalAccounts,
  hasAccountsWithErrors,
  hasAppAccounts,
  prepareDeepScanDisplayApps,
  prepareDisplayApps,
  setDefaultDestinationAddress,
} from '../ledger'

// Mock axios
vi.mock('axios')

// Mock fetch
global.fetch = vi.fn()

// Mock balance utilities
vi.mock('../balance', () => ({
  hasAddressBalance: vi.fn(account => {
    if (!account.balances) return false
    return account.balances.some((balance: any) => {
      if (balance.type === BalanceType.NATIVE) {
        return balance.balance?.total?.gt(new BN(0))
      }
      return balance.balance?.length > 0
    })
  }),
  hasBalance: vi.fn(balances => {
    return balances.some((balance: any) => {
      if (balance.type === BalanceType.NATIVE) {
        return balance.balance?.total?.gt(new BN(0))
      }
      return balance.balance?.length > 0
    })
  }),
}))

// Mock synchronization service
vi.mock('@/lib/services/synchronization.service', () => ({
  getValidApps: vi.fn(() => [
    { id: 'polkadot', name: 'Polkadot' },
    { id: 'kusama', name: 'Kusama' },
    { id: 'westend', name: 'Westend' },
  ]),
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

  describe('filterValidSelectedAccountsForMigration', () => {
    it('should filter only selected accounts with balances and destination address', () => {
      const safeMockAddressBalances = mockAddress.balances ? mockAddress.balances : []
      const safeMockMultisigBalances = mockMultisigAddress.balances ? mockMultisigAddress.balances : []
      const apps: App[] = [
        {
          ...mockApp,
          accounts: [
            {
              ...mockAddress,
              selected: true,
              balances: [
                {
                  ...safeMockAddressBalances[0],
                  transaction: { destinationAddress: '5GDest1' },
                },
              ],
            },
            {
              ...mockAddress,
              selected: false,
              balances: [
                {
                  ...safeMockAddressBalances[0],
                  transaction: { destinationAddress: '5GDest2' },
                },
              ],
            },
            {
              ...mockAddress,
              selected: true,
              balances: [
                {
                  ...safeMockAddressBalances[0],
                  transaction: undefined, // No destination address
                },
              ],
            },
          ],
          multisigAccounts: [
            {
              ...mockMultisigAddress,
              selected: true,
              balances: [
                {
                  ...safeMockMultisigBalances[0],
                  transaction: { destinationAddress: '5GDest3' },
                },
              ],
            },
            {
              ...mockMultisigAddress,
              selected: false,
              balances: [
                {
                  ...safeMockMultisigBalances[0],
                  transaction: { destinationAddress: '5GDest4' },
                },
              ],
            },
            {
              ...mockMultisigAddress,
              selected: true,
              balances: [
                {
                  ...safeMockMultisigBalances[0],
                  transaction: undefined, // No destination address
                },
              ],
            },
          ],
        },
      ]

      const result = filterValidSelectedAccountsForMigration(apps)

      expect(result).toHaveLength(1)
      expect(result[0]?.accounts?.length).toBe(1)
      expect(result[0]?.multisigAccounts?.length).toBe(1)
      expect(result[0]?.accounts?.[0]?.selected).toBe(true)
      const accBalances = result[0]?.accounts?.[0]?.balances ?? []
      expect(accBalances.length > 0 && accBalances[0]?.transaction?.destinationAddress).toBe('5GDest1')
      expect(result[0]?.multisigAccounts?.[0]?.selected).toBe(true)
      const msBalances = result[0]?.multisigAccounts?.[0]?.balances ?? []
      expect(msBalances.length > 0 && msBalances[0]?.transaction?.destinationAddress).toBe('5GDest3')
    })

    it('should exclude apps with no selected accounts with balances and destination address', () => {
      const safeMockAddressBalances = mockAddress.balances ? mockAddress.balances : []
      const safeMockMultisigBalances = mockMultisigAddress.balances ? mockMultisigAddress.balances : []
      const apps: App[] = [
        {
          ...mockApp,
          accounts: [
            {
              ...mockAddress,
              selected: false,
              balances: [
                {
                  ...safeMockAddressBalances[0],
                  transaction: { destinationAddress: '5GDest1' },
                },
              ],
            },
            {
              ...mockAddress,
              selected: true,
              balances: [
                {
                  ...safeMockAddressBalances[0],
                  transaction: undefined, // No destination address
                },
              ],
            },
          ],
          multisigAccounts: [
            {
              ...mockMultisigAddress,
              selected: false,
              balances: [
                {
                  ...safeMockMultisigBalances[0],
                  transaction: { destinationAddress: '5GDest2' },
                },
              ],
            },
            {
              ...mockMultisigAddress,
              selected: true,
              balances: [
                {
                  ...safeMockMultisigBalances[0],
                  transaction: undefined, // No destination address
                },
              ],
            },
          ],
        },
      ]

      const result = filterValidSelectedAccountsForMigration(apps)

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
      const accounts = [mockAddress, { ...mockAddress, balances: [] }]

      const result = filterAccountsForApps(accounts, false)

      expect(result).toHaveLength(2)
    })

    it('should filter accounts with balances when filterByBalance is true', () => {
      const accounts = [mockAddress, { ...mockAddress, balances: [] }]

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
            ...mockAddress.balances?.[0],
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
            ...mockAddress.balances?.[0],
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
            ...mockAddress.balances?.[0],
            transaction: undefined,
          },
        ] as AddressBalance[],
      }

      const result = setDefaultDestinationAddress(account, '5GNewAddress')

      expect(result.balances?.[0].transaction?.destinationAddress).toBe('5GNewAddress')
    })
  })

  describe('addDestinationAddressesFromAccounts', () => {
    const polkadotAddresses = ['5GAddress1', '5GAddress2']

    it('should add unique destination addresses to the map', () => {
      const addressMap = new Map<string, AddressWithVerificationStatus>()
      const accounts = [
        {
          ...mockAddress,
          balances: [
            {
              ...mockAddress.balances?.[0],
              transaction: { destinationAddress: polkadotAddresses[0] },
            },
            {
              ...mockAddress.balances?.[0],
              transaction: { destinationAddress: polkadotAddresses[1] },
            },
          ] as AddressBalance[],
        },
      ]

      addDestinationAddressesFromAccounts(accounts, addressMap, polkadotAddresses)

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
              ...mockAddress.balances?.[0],
              transaction: { destinationAddress: '5GAddress1' },
            },
          ] as AddressBalance[],
        },
      ]

      addDestinationAddressesFromAccounts(accounts, addressMap, polkadotAddresses)

      expect(addressMap.size).toBe(1)
      expect(addressMap.get('5GAddress1')?.path).toBe('existing/path')
    })

    it('should handle undefined accounts', () => {
      const addressMap = new Map<string, AddressWithVerificationStatus>()

      addDestinationAddressesFromAccounts(undefined, addressMap, polkadotAddresses)

      expect(addressMap.size).toBe(0)
    })

    it('should skip balances without destination addresses', () => {
      const addressMap = new Map<string, AddressWithVerificationStatus>()
      const accounts = [
        {
          ...mockAddress,
          balances: [
            {
              ...mockAddress.balances?.[0],
              transaction: { destinationAddress: '' },
            },
          ] as AddressBalance[],
        },
      ]

      addDestinationAddressesFromAccounts(accounts, addressMap, polkadotAddresses)

      expect(addressMap.size).toBe(0)
    })
  })

  describe('prepareDisplayApps', () => {
    it('should return apps with balances from appsWithoutErrors', () => {
      const apps: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [],
          multisigAccounts: [],
        },
      ]
      const appsWithoutErrors: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [mockAddress, mockAddress],
          multisigAccounts: [mockMultisigAddress],
        },
      ]

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      expect(result).toHaveLength(3) // All config apps
      const polkadotApp = result.find(app => app.id === 'polkadot')
      expect(polkadotApp).toBeDefined()
      expect(polkadotApp?.name).toBe('Polkadot')
      expect(polkadotApp?.status).toBe(AppStatus.SYNCHRONIZED)
      expect(polkadotApp?.totalAccounts).toBe(3) // 2 accounts + 1 multisig
    })

    it('should fallback to synced apps when app not in appsWithoutErrors', () => {
      const apps: App[] = [
        {
          id: 'kusama',
          name: 'Kusama',
          status: AppStatus.LOADING,
          accounts: [mockAddress],
          multisigAccounts: [],
        },
      ]
      const appsWithoutErrors: App[] = []

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      const kusamaApp = result.find(app => app.id === 'kusama')
      expect(kusamaApp).toBeDefined()
      expect(kusamaApp?.name).toBe('Kusama')
      expect(kusamaApp?.status).toBe(AppStatus.LOADING)
      expect(kusamaApp?.totalAccounts).toBe(0) // Accounts not counted when status is not SYNCHRONIZED
    })

    it('should return default state for apps not yet scanned', () => {
      const apps: App[] = []
      const appsWithoutErrors: App[] = []

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      expect(result).toHaveLength(3)
      const westendApp = result.find(app => app.id === 'westend')
      expect(westendApp).toBeDefined()
      expect(westendApp?.name).toBe('Westend')
      expect(westendApp?.status).toBeUndefined()
      expect(westendApp?.totalAccounts).toBe(0)
    })

    it('should handle apps with only regular accounts', () => {
      const apps: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [],
          multisigAccounts: [],
        },
      ]
      const appsWithoutErrors: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [mockAddress, mockAddress, mockAddress],
          multisigAccounts: [],
        },
      ]

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      const polkadotApp = result.find(app => app.id === 'polkadot')
      expect(polkadotApp?.totalAccounts).toBe(3)
    })

    it('should handle apps with only multisig accounts', () => {
      const apps: App[] = [
        {
          id: 'kusama',
          name: 'Kusama',
          status: AppStatus.SYNCHRONIZED,
          accounts: [],
          multisigAccounts: [],
        },
      ]
      const appsWithoutErrors: App[] = [
        {
          id: 'kusama',
          name: 'Kusama',
          status: AppStatus.SYNCHRONIZED,
          accounts: [],
          multisigAccounts: [mockMultisigAddress, mockMultisigAddress],
        },
      ]

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      const kusamaApp = result.find(app => app.id === 'kusama')
      expect(kusamaApp?.totalAccounts).toBe(2)
    })

    it('should handle apps with undefined accounts', () => {
      const apps: App[] = [
        {
          id: 'westend',
          name: 'Westend',
          status: AppStatus.LOADING,
          accounts: undefined,
          multisigAccounts: undefined,
        },
      ]
      const appsWithoutErrors: App[] = []

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      const westendApp = result.find(app => app.id === 'westend')
      expect(westendApp?.totalAccounts).toBe(0)
    })

    it('should prioritize appsWithoutErrors account counts when app is synchronized', () => {
      const apps: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot Old',
          status: AppStatus.SYNCHRONIZED,
          accounts: [mockAddress],
          multisigAccounts: [],
        },
      ]
      const appsWithoutErrors: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot New',
          status: AppStatus.SYNCHRONIZED,
          accounts: [mockAddress, mockAddress],
          multisigAccounts: [mockMultisigAddress],
        },
      ]

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      const polkadotApp = result.find(app => app.id === 'polkadot')
      expect(polkadotApp?.name).toBe('Polkadot') // Name comes from config
      expect(polkadotApp?.status).toBe(AppStatus.SYNCHRONIZED) // Status comes from apps
      expect(polkadotApp?.totalAccounts).toBe(3) // Accounts come from appsWithoutErrors
    })

    it('should handle mixed states for different apps', () => {
      const apps: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [],
          multisigAccounts: [],
        },
        {
          id: 'kusama',
          name: 'Kusama',
          status: AppStatus.LOADING,
          accounts: [],
          multisigAccounts: [],
        },
      ]
      const appsWithoutErrors: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [mockAddress],
          multisigAccounts: [],
        },
      ]

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      expect(result).toHaveLength(3)

      const polkadotApp = result.find(app => app.id === 'polkadot')
      expect(polkadotApp?.status).toBe(AppStatus.SYNCHRONIZED)
      expect(polkadotApp?.totalAccounts).toBe(1)

      const kusamaApp = result.find(app => app.id === 'kusama')
      expect(kusamaApp?.status).toBe(AppStatus.LOADING)
      expect(kusamaApp?.totalAccounts).toBe(0)

      const westendApp = result.find(app => app.id === 'westend')
      expect(westendApp?.status).toBeUndefined()
      expect(westendApp?.totalAccounts).toBe(0)
    })

    it('should handle apps with error status', () => {
      const apps: App[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.ERROR,
          accounts: [],
          multisigAccounts: [],
        },
      ]
      const appsWithoutErrors: App[] = []

      const result = prepareDisplayApps(apps, appsWithoutErrors)

      const polkadotApp = result.find(app => app.id === 'polkadot')
      expect(polkadotApp?.status).toBe(AppStatus.ERROR)
      expect(polkadotApp?.totalAccounts).toBe(0)
    })
  })

  describe('prepareDeepScanDisplayApps', () => {
    it('should convert deep scan apps to display info with originalAccountCount', () => {
      const deepScanApps: (App & { originalAccountCount: number })[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [mockAddress, mockAddress, mockAddress],
          multisigAccounts: [mockMultisigAddress],
          originalAccountCount: 2,
        },
      ]

      const result = prepareDeepScanDisplayApps(deepScanApps)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'polkadot',
        name: 'Polkadot',
        status: AppStatus.SYNCHRONIZED,
        totalAccounts: 4, // 3 accounts + 1 multisig
        originalAccountCount: 2,
      })
    })

    it('should handle apps with only regular accounts', () => {
      const deepScanApps: (App & { originalAccountCount: number })[] = [
        {
          id: 'kusama',
          name: 'Kusama',
          status: AppStatus.LOADING,
          accounts: [mockAddress],
          multisigAccounts: [],
          originalAccountCount: 0,
        },
      ]

      const result = prepareDeepScanDisplayApps(deepScanApps)

      expect(result[0].totalAccounts).toBe(1)
      expect(result[0].originalAccountCount).toBe(0)
    })

    it('should handle apps with only multisig accounts', () => {
      const deepScanApps: (App & { originalAccountCount: number })[] = [
        {
          id: 'westend',
          name: 'Westend',
          status: AppStatus.SYNCHRONIZED,
          accounts: [],
          multisigAccounts: [mockMultisigAddress, mockMultisigAddress],
          originalAccountCount: 1,
        },
      ]

      const result = prepareDeepScanDisplayApps(deepScanApps)

      expect(result[0].totalAccounts).toBe(2)
      expect(result[0].originalAccountCount).toBe(1)
    })

    it('should handle apps with undefined accounts', () => {
      const deepScanApps: (App & { originalAccountCount: number })[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.LOADING,
          accounts: undefined,
          multisigAccounts: undefined,
          originalAccountCount: 0,
        },
      ]

      const result = prepareDeepScanDisplayApps(deepScanApps)

      expect(result[0].totalAccounts).toBe(0)
      expect(result[0].originalAccountCount).toBe(0)
    })

    it('should calculate new accounts found correctly', () => {
      const deepScanApps: (App & { originalAccountCount: number })[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [mockAddress, mockAddress, mockAddress],
          multisigAccounts: [mockMultisigAddress, mockMultisigAddress],
          originalAccountCount: 2, // Had 2 accounts before deep scan
        },
      ]

      const result = prepareDeepScanDisplayApps(deepScanApps)

      // totalAccounts (5) - originalAccountCount (2) = 3 new accounts found
      expect(result[0].totalAccounts).toBe(5)
      expect(result[0].originalAccountCount).toBe(2)
      expect(result[0].totalAccounts - result[0].originalAccountCount).toBe(3)
    })

    it('should handle multiple apps with different originalAccountCount', () => {
      const deepScanApps: (App & { originalAccountCount: number })[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.SYNCHRONIZED,
          accounts: [mockAddress, mockAddress],
          multisigAccounts: [],
          originalAccountCount: 1,
        },
        {
          id: 'kusama',
          name: 'Kusama',
          status: AppStatus.SYNCHRONIZED,
          accounts: [],
          multisigAccounts: [mockMultisigAddress],
          originalAccountCount: 0,
        },
        {
          id: 'westend',
          name: 'Westend',
          status: AppStatus.LOADING,
          accounts: [],
          multisigAccounts: [],
          originalAccountCount: 0,
        },
      ]

      const result = prepareDeepScanDisplayApps(deepScanApps)

      expect(result).toHaveLength(3)
      expect(result[0]).toMatchObject({
        id: 'polkadot',
        totalAccounts: 2,
        originalAccountCount: 1,
      })
      expect(result[1]).toMatchObject({
        id: 'kusama',
        totalAccounts: 1,
        originalAccountCount: 0,
      })
      expect(result[2]).toMatchObject({
        id: 'westend',
        totalAccounts: 0,
        originalAccountCount: 0,
      })
    })

    it('should handle apps with error status', () => {
      const deepScanApps: (App & { originalAccountCount: number })[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.ERROR,
          accounts: [],
          multisigAccounts: [],
          originalAccountCount: 0,
        },
      ]

      const result = prepareDeepScanDisplayApps(deepScanApps)

      expect(result[0].status).toBe(AppStatus.ERROR)
      expect(result[0].totalAccounts).toBe(0)
    })

    it('should preserve app status during deep scan', () => {
      const deepScanApps: (App & { originalAccountCount: number })[] = [
        {
          id: 'polkadot',
          name: 'Polkadot',
          status: AppStatus.LOADING,
          accounts: [mockAddress],
          multisigAccounts: [],
          originalAccountCount: 0,
        },
      ]

      const result = prepareDeepScanDisplayApps(deepScanApps)

      expect(result[0].status).toBe(AppStatus.LOADING)
    })
  })
})
