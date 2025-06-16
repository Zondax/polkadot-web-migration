import { ledgerClient } from '@/lib/client/ledger'
import type { ConnectionResponse, DeviceConnectionProps } from '@/lib/ledger/types'
import { DeviceModelId } from '@ledgerhq/devices'
import { observable } from '@legendapp/state'
import { type App, AppStatus } from 'state/ledger'
import { ledgerState$ } from 'state/ledger'
import { type Address, BalanceType, type Native } from 'state/types/ledger'
import { vi } from 'vitest'

export const genericAppMock = {
  getVersion: vi.fn(),
  getAddress: vi.fn(),
  getAddressEd25519: vi.fn(),
  getAddressEcdsa: vi.fn(),
  sign: vi.fn(),
  signEd25519: vi.fn(),
  signEcdsa: vi.fn(),
  signRaw: vi.fn(),
  signRawEd25519: vi.fn(),
  signRawEcdsa: vi.fn(),
  signWithMetadata: vi.fn(),
  signWithMetadataEd25519: vi.fn(),
  signWithMetadataEcdsa: vi.fn(),
}

export const transportMock = {
  deviceModel: {
    id: DeviceModelId.nanoS,
    productName: 'Nano S',
  },
  exchange: vi.fn(),
  close: vi.fn(),
}

// Simplified mock for testing purposes
export const mockDeviceConnection = {
  transport: transportMock,
  genericApp: genericAppMock,
  isAppOpen: false,
}

export const mockConnection = {
  error: undefined,
  connection: mockDeviceConnection,
}

export const mockAddress = {
  address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  path: "m/44'/434'/0'/0'/0'",
  pubKey: '0x123456',
}

export const mockApp: App = {
  id: 'kusama',
  name: 'Kusama',
  token: {
    symbol: 'KSM',
    decimals: 12,
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [
    {
      address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      path: "m/44'/434'/0'/0'/0'",
      pubKey: '0x123456',
    },
  ],
}

// Setup state with transport connected, and polkadot app defined, but app not open
export const setupTransportConnectedState = () => {
  vi.clearAllMocks()

  ledgerState$.device.set({
    connection: mockDeviceConnection as unknown as DeviceConnectionProps,
    isLoading: false,
    error: undefined,
  })
}

// Setup state with transport connected and app open
export const setupTransportAndAppConnectedState = () => {
  vi.clearAllMocks()

  ledgerState$.device.set({
    connection: {
      ...(mockDeviceConnection as unknown as DeviceConnectionProps),
      isAppOpen: true,
    },
    isLoading: false,
    error: undefined,
  })
}

// Utility to mock ledgerClient.connectDevice to return a custom object
export function mockLedgerClientConnectDevice() {
  // Dynamically require to avoid hoisting issues with ESM/CJS
  vi.spyOn(ledgerClient, 'connectDevice').mockResolvedValue({
    connection: {
      ...(mockDeviceConnection as unknown as DeviceConnectionProps),
      isAppOpen: true,
    },
    error: undefined,
  })
}

export function mockLedgerClientSynchronizeAccounts() {
  vi.spyOn(ledgerClient, 'synchronizeAccounts').mockResolvedValue({
    result: [mockAddress as Address],
  })
}

// Mock values for balances, collections, and NFTs
export const mockNativeBalance = {
  free: 100000000000,
  reserved: 0,
  frozen: 0,
  total: 100000000000,
  transferable: 100000000000,
}

export const mockUniquesNfts = [
  {
    collectionId: 1,
    itemId: 1,
    creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    isUnique: true,
    isFrozen: false,
  },
]

export const mockUniquesCollections = [
  {
    collectionId: 1,
    owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    items: 1,
    name: 'Mock Uniques Collection',
    image: '',
    description: 'A mock uniques collection',
    external_url: '',
    mediaUri: '',
    attributes: [],
  },
]

export const mockNfts = [
  {
    collectionId: 2,
    itemId: 2,
    creator: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    isUnique: false,
    isFrozen: false,
  },
]

export const mockNftCollections = [
  {
    collectionId: 2,
    owner: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    items: 1,
    name: 'Mock NFT Collection',
    image: '',
    description: 'A mock NFT collection',
    external_url: '',
    mediaUri: '',
    attributes: [],
  },
]

// Mock getNativeBalance
export function mockGetNativeBalance() {
  const mod = require('@/lib/account')
  vi.spyOn(mod, 'getNativeBalance').mockResolvedValue(mockNativeBalance)
}

// Mock getUniquesOwnedByAccount
export function mockGetUniquesOwnedByAccount() {
  const mod = require('@/lib/account')
  vi.spyOn(mod, 'getUniquesOwnedByAccount').mockResolvedValue({
    nfts: mockUniquesNfts,
    collections: mockUniquesCollections,
  })
}

// Mock getNFTsOwnedByAccount
export function mockGetNFTsOwnedByAccount() {
  const mod = require('@/lib/account')
  vi.spyOn(mod, 'getNFTsOwnedByAccount').mockResolvedValue({
    nfts: mockNfts,
    collections: mockNftCollections,
  })
}

// Mock getBalance to use the above mocks
// export function mockGetBalance() {
//   const mod = require('@/lib/account')
//   vi.spyOn(mod, 'getBalance').mockImplementation(async (address, api) => {
//     return {
//       balances: [
//         { type: 'native', balance: mockNativeBalance },
//         { type: 'unique', balance: mockUniquesNfts },
//         { type: 'nft', balance: mockNfts },
//       ],
//       collections: {
//         uniques: mockUniquesCollections,
//         nfts: mockNftCollections,
//       },
//     }
//   })
// }
