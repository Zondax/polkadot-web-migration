import type { AppConfig } from '@/config/apps'
import { appsConfigs } from '@/config/apps'
import type { SubmittableExtrinsic } from '@polkadot/api/types'
import type { ISubmittableResult } from '@polkadot/types/types'
import { BN } from '@polkadot/util'
import { type App, AppStatus } from 'state/ledger'
import { type Address, BalanceType, type Collection, type MultisigAddress, type Native, type Nft, type Staking } from 'state/types/ledger'
import { vi } from 'vitest'

// =========== Common Test Addresses ===========
export const TEST_ADDRESSES = {
  ADDRESS1: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
  ADDRESS2: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
  ADDRESS3: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW',
  ADDRESS4: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
  ADDRESS5: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL',
  ADDRESS6: '5H4MvAsobfZ6bBCDyj5dsrWYLrA8HrRzaqa9p61UXtxMhSCY',
  ADDRESS7: '5DAUh2JEqgjoq7xKmvUdaNkDRRtwqYGtxKzovLHdkkNcsuFJ',
  ADDRESS8: 'Gsmu7iGq4cQg7oAxFgAA9dUPKu9iRKGvbFLNUGhEkEB3Ybt', // kusama asset hub address with uniques
  ADDRESS9: 'Gq9CTYACKtgA1dyrM5yh7oDK6yh1P3ErjcxZvDmJu9YjdB5', // kusama staking address with bonded
  ADDRESS10: 'F4aqRHwLaCk2EoEewPWKpJBGdrvkssQAtrBmQ5LdNSweUfV', // internal address with identity and parent account
  ADDRESS11: 'HHEEgVzcqL3kCXgsxSfJMbsTy8dxoTctuXtpY94n4s8F4pS', // address with identity and no parent account
}

// test rpc endpoints
export const KUSAMA_RPC = appsConfigs.get('kusama')?.rpcEndpoint || 'wss://kusama-rpc.polkadot.io'
export const KUSAMA_PEOPLE_RPC = appsConfigs.get('people-kusama')?.rpcEndpoint || 'wss://people-kusama.api.onfinality.io/public-ws'
export const KUSAMA_ASSET_HUB_RPC = appsConfigs.get('kusama-asset-hub')?.rpcEndpoint || 'wss://asset-hub-kusama-rpc.dwellir.com'

// =========== Mock Staking ===========
export const mockStaking: Staking = {
  total: new BN(1000000000000),
  active: new BN(800000000000),
  unlocking: [
    {
      value: new BN(100000000000),
      era: 2400,
      timeRemaining: '7 days and 2 hours',
      canWithdraw: false,
    },
    {
      value: new BN(100000000000),
      era: 2500,
      timeRemaining: '7 days and 0 hours',
      canWithdraw: false,
    },
  ],
  claimedRewards: [new BN(2300), new BN(2350)],
  controller: TEST_ADDRESSES.ADDRESS1,
  canUnstake: false,
}

// =========== Mock NFTs ===========
export const mockNft1: Nft = {
  collectionId: '1',
  itemId: '101',
  creator: TEST_ADDRESSES.ADDRESS1,
  owner: TEST_ADDRESSES.ADDRESS1,
}

export const mockNft2: Nft = {
  collectionId: '1',
  itemId: '102',
  creator: TEST_ADDRESSES.ADDRESS1,
  owner: TEST_ADDRESSES.ADDRESS1,
}

export const mockNft3: Nft = {
  collectionId: '2',
  itemId: '201',
  creator: TEST_ADDRESSES.ADDRESS3,
  owner: TEST_ADDRESSES.ADDRESS3,
}

export const mockNft4: Nft = {
  collectionId: '3',
  itemId: '301',
  creator: TEST_ADDRESSES.ADDRESS5,
  owner: TEST_ADDRESSES.ADDRESS5,
}

// NFTs with numeric collection IDs
export const mockNftNumericId1: Nft = {
  collectionId: 4,
  itemId: '401',
  creator: TEST_ADDRESSES.ADDRESS6,
  owner: TEST_ADDRESSES.ADDRESS6,
}

export const mockNftNumericId2: Nft = {
  collectionId: 4,
  itemId: '402',
  creator: TEST_ADDRESSES.ADDRESS6,
  owner: TEST_ADDRESSES.ADDRESS6,
}

export const mockUnique: Nft = {
  collectionId: '2',
  itemId: '1',
  creator: TEST_ADDRESSES.ADDRESS1,
  owner: TEST_ADDRESSES.ADDRESS1,
  isUnique: true,
}

// =========== Mock Collections ===========
export const mockCollection1: Collection = {
  collectionId: 1,
  name: 'Collection One',
  owner: TEST_ADDRESSES.ADDRESS1,
  items: 2,
  image: 'ipfs://collection1.png',
}

export const mockCollection2: Collection = {
  collectionId: 2,
  name: 'Collection Two',
  owner: TEST_ADDRESSES.ADDRESS3,
  items: 1,
  image: 'ipfs://collection2.png',
}

export const mockCollection3: Collection = {
  collectionId: 3,
  name: 'Collection Three',
  owner: TEST_ADDRESSES.ADDRESS5,
  items: 1,
}

export const mockCollection4: Collection = {
  collectionId: 4,
  name: 'Collection Four',
  owner: TEST_ADDRESSES.ADDRESS6,
  items: 2,
}

// =========== Mock Addresses ===========
// mock empty native balance
export const mockEmptyNativeBalance: Native = {
  total: new BN(0),
  free: new BN(0),
  reserved: { total: new BN(0) },
  frozen: new BN(0),
  transferable: new BN(0),
}

// mock free native balance
export const mockFreeNativeBalance: Native = {
  total: new BN(1000),
  free: new BN(1000),
  reserved: { total: new BN(0) },
  frozen: new BN(0),
  transferable: new BN(1000),
}

// mock reserved native balance
export const mockReservedNativeBalance: Native = {
  total: new BN(1000),
  free: new BN(0),
  reserved: { total: new BN(1000) },
  frozen: new BN(0),
  transferable: new BN(0),
}

// mock frozen native balance
export const mockFrozenNativeBalance: Native = {
  total: new BN(1000),
  free: new BN(0),
  reserved: { total: new BN(0) },
  frozen: new BN(1000),
  transferable: new BN(0),
}

// mock staked native balance
export const mockStakedNativeBalance: Native = {
  total: new BN(1000),
  free: new BN(0),
  reserved: { total: new BN(0) },
  frozen: new BN(0),
  transferable: new BN(0),
  staking: mockStaking,
}

export const mockAddress1: Address = {
  path: "m/44'/354'/0'/0'",
  pubKey: '0x123',
  address: TEST_ADDRESSES.ADDRESS1,
  balances: [
    {
      type: BalanceType.NATIVE,
      balance: mockFreeNativeBalance,
    },
    {
      type: BalanceType.NFT,
      balance: [],
    },
    {
      type: BalanceType.UNIQUE,
      balance: [],
    },
  ],
}

export const mockAddress2: Address = {
  path: "m/44'/354'/0'/1'",
  pubKey: '0x456',
  address: TEST_ADDRESSES.ADDRESS2,
  balances: [
    {
      type: BalanceType.NATIVE,
      balance: mockEmptyNativeBalance,
    },
    {
      type: BalanceType.NFT,
      balance: [mockNft1],
    },
    {
      type: BalanceType.UNIQUE,
      balance: [],
    },
  ],
}

export const mockAddress3: Address = {
  path: "m/44'/354'/0'/2'",
  pubKey: '0x789',
  address: TEST_ADDRESSES.ADDRESS3,
  balances: [
    {
      type: BalanceType.NATIVE,
      balance: mockEmptyNativeBalance,
    },
    {
      type: BalanceType.NFT,
      balance: [],
    },
    {
      type: BalanceType.UNIQUE,
      balance: [mockUnique],
    },
  ],
}

export const mockAddressWithError: Address = {
  path: "m/44'/354'/0'/3'",
  pubKey: '0xabc',
  address: TEST_ADDRESSES.ADDRESS4,
  error: {
    source: 'balance_fetch',
    description: 'Failed to sync',
  },
  balances: undefined,
}

export const mockAddressWithMigrationError: Address = {
  path: "m/44'/354'/0'/4'",
  pubKey: '0xdef',
  address: TEST_ADDRESSES.ADDRESS5,
  error: {
    source: 'migration',
    description: 'Migration failed',
  },
  balances: undefined,
}

export const mockAddressWithMigrationErrorAndBalance: Address = {
  path: "m/44'/354'/0'/4'",
  pubKey: '0xdef',
  address: TEST_ADDRESSES.ADDRESS5,
  error: {
    source: 'migration',
    description: 'Migration failed',
  },
  balances: [
    {
      type: BalanceType.NATIVE,
      balance: mockFreeNativeBalance,
    },
  ],
}

export const mockAddressNoBalance: Address = {
  path: "m/44'/354'/0'/5'",
  pubKey: '0xeee',
  address: TEST_ADDRESSES.ADDRESS6,
  balances: [
    {
      type: BalanceType.NATIVE,
      balance: mockEmptyNativeBalance,
    },
    {
      type: BalanceType.NFT,
      balance: [],
    },
    {
      type: BalanceType.UNIQUE,
      balance: [],
    },
  ],
}

export const mockAddressPartialBalance: Address = {
  path: "m/44'/354'/0'/6'",
  pubKey: '0xfff',
  address: TEST_ADDRESSES.ADDRESS7,
  balances: [
    {
      type: BalanceType.NATIVE,
      balance: mockEmptyNativeBalance,
    },
    {
      type: BalanceType.NFT,
      balance: [],
    },
    {
      type: BalanceType.UNIQUE,
      balance: [],
    },
  ],
}

export const mockMultisigAddress1: MultisigAddress = {
  path: "m/44'/354'/0'/0'",
  pubKey: '0x123',
  address: TEST_ADDRESSES.ADDRESS2,
  members: [
    {
      address: TEST_ADDRESSES.ADDRESS1,
      internal: false,
    },
  ],
  threshold: 2,
  memberMultisigAddresses: undefined,
  pendingMultisigCalls: [],
  balances: [
    {
      type: BalanceType.NATIVE,
      balance: mockFreeNativeBalance,
    },
  ],
}

export const mockMultisigAddressWithError: MultisigAddress = {
  path: "m/44'/354'/0'/1'",
  pubKey: '0x456',
  address: TEST_ADDRESSES.ADDRESS3,
  members: [
    {
      address: TEST_ADDRESSES.ADDRESS1,
      internal: true,
      path: "m/44'/354'/0'/0'",
    },
    {
      address: TEST_ADDRESSES.ADDRESS2,
      internal: false,
    },
  ],
  threshold: 2,
  memberMultisigAddresses: undefined,
  pendingMultisigCalls: [],
  error: {
    source: 'balance_fetch',
    description: 'Failed to sync multisig account',
  },
  balances: undefined,
}

export const mockMultisigAddressWithMigrationError: MultisigAddress = {
  path: "m/44'/354'/0'/2'",
  pubKey: '0x789',
  address: TEST_ADDRESSES.ADDRESS4,
  members: [
    {
      address: TEST_ADDRESSES.ADDRESS1,
      internal: true,
      path: "m/44'/354'/0'/0'",
    },
  ],
  threshold: 1,
  memberMultisigAddresses: undefined,
  pendingMultisigCalls: [],
  error: {
    source: 'migration',
    description: 'Migration failed for multisig account',
  },
  balances: undefined,
}

export const mockMultisigAddressNoBalance: MultisigAddress = {
  path: "m/44'/354'/0'/3'",
  pubKey: '0xabc',
  address: TEST_ADDRESSES.ADDRESS5,
  members: [
    {
      address: TEST_ADDRESSES.ADDRESS1,
      internal: false,
    },
  ],
  threshold: 1,
  memberMultisigAddresses: undefined,
  pendingMultisigCalls: [],
  balances: [
    {
      type: BalanceType.NATIVE,
      balance: mockEmptyNativeBalance,
    },
  ],
}

// =========== Mock Apps ===========
export const mockApp1: App = {
  name: 'App 1',
  id: 'polkadot',
  token: {
    symbol: 'DOT',
    decimals: 10,
    logoId: 'polkadot',
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [mockAddress1, mockAddress2],
}

export const mockApp2: App = {
  name: 'App 2',
  id: 'kusama',
  token: {
    symbol: 'KSM',
    decimals: 12,
    logoId: 'kusama',
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [mockAddress3, mockAddressWithError],
}

export const mockAppWithMigrationError: App = {
  name: 'App 3',
  id: 'westend',
  token: {
    symbol: 'WND',
    decimals: 12,
    logoId: 'westend',
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [mockAddressWithMigrationError, mockAddressWithMigrationErrorAndBalance],
}

export const mockAppWithAppError: App = {
  name: 'App 4',
  id: 'acala',
  token: {
    symbol: 'ACA',
    decimals: 12,
    logoId: 'acala',
  },
  status: AppStatus.ERROR,
  error: {
    source: 'synchronization',
    description: 'App sync failed',
  },
  accounts: [],
}

export const mockAppMixedErrorTypes: App = {
  name: 'App 5',
  id: 'moonbeam',
  token: {
    symbol: 'GLMR',
    decimals: 18,
    logoId: 'moonbeam',
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [mockAddress1, mockAddressWithError, mockAddressWithMigrationError],
}

export const mockAppNoAccounts: App = {
  name: 'App 6',
  id: 'astar',
  token: {
    symbol: 'ASTR',
    decimals: 18,
    logoId: 'astar',
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [],
}

export const mockAppWithMultisigAccounts: App = {
  ...mockApp1,
  multisigAccounts: [mockMultisigAddress1],
}

export const mockAppOnlyMultisigAccounts: App = {
  name: 'App Only Multisig',
  id: 'app-multisig-only',
  token: {
    symbol: 'MULTI',
    decimals: 10,
    logoId: 'multisig',
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [],
  multisigAccounts: [mockMultisigAddress1, mockMultisigAddressNoBalance],
}

export const mockAppWithMultisigErrors: App = {
  name: 'App Multisig Errors',
  id: 'app-multisig-errors',
  token: {
    symbol: 'ERR',
    decimals: 10,
    logoId: 'error',
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [mockAddress1],
  multisigAccounts: [mockMultisigAddressWithError, mockMultisigAddressWithMigrationError],
}

export const mockAppMixedMultisigErrors: App = {
  name: 'App Mixed Multisig Errors',
  id: 'app-mixed-multisig',
  token: {
    symbol: 'MIX',
    decimals: 10,
    logoId: 'mixed',
  },
  status: AppStatus.SYNCHRONIZED,
  accounts: [mockAddress1, mockAddressWithError],
  multisigAccounts: [mockMultisigAddress1, mockMultisigAddressWithError, mockMultisigAddressWithMigrationError],
}

// =========== Grouped Mock Data ===========
export const mockNfts = [mockNft1, mockNft2, mockNft3, mockNft4]
export const mockMixedIdNfts = [mockNft1, mockNftNumericId1, mockNft3]
export const mockCollections = [mockCollection1, mockCollection2, mockCollection3, mockCollection4]
export const mockApps = [mockApp1, mockApp2, mockAppWithMigrationError, mockAppWithAppError]
export const mockAppsExtended = [...mockApps, mockAppMixedErrorTypes, mockAppNoAccounts]

export const mockAppConfig: AppConfig = {
  id: 'test',
  name: 'TestApp',
  bip44Path: "m/44'/354'/0'/0/0",
  ss58Prefix: 42,
  token: { decimals: 12, symbol: 'UNIT' },
}

export const mockMethod = { toHex: () => '0xdeadbeef' }
export const mockApi = {
  tx: {
    nfts: { transfer: vi.fn(() => ({ method: mockMethod, toString: () => 'nftTransfer', paymentInfo: vi.fn() })) },
    uniques: { transfer: vi.fn(() => ({ method: mockMethod, toString: () => 'uniqueTransfer', paymentInfo: vi.fn() })) },
    balances: {
      transferKeepAlive: vi.fn((_: string, amount: number) => ({
        method: mockMethod,
        toString: () => `nativeTransfer:${amount}`,
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: { toString: () => '10' } }),
      })),
    },
    utility: {
      batchAll: vi.fn((calls: SubmittableExtrinsic<'promise', ISubmittableResult>[]) => ({
        method: mockMethod,
        toString: () => `batch:${calls.join(',')}`,
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: { toString: () => '10' } }),
      })),
    },
  },
  query: {
    system: { account: vi.fn() },
  },
  call: {
    metadata: {
      metadataAtVersion: vi.fn().mockResolvedValue({
        isNone: false,
        unwrap: () => ({
          digest: () => 'mockDigest',
          getProofForExtrinsicPayload: () => new Uint8Array([1, 2, 3]),
        }),
      }),
    },
  },
  runtimeVersion: {
    transactionVersion: 1,
    specVersion: 1,
  },
  genesisHash: '0x1234567890abcdef',
  extrinsicVersion: 4,
  createType: vi.fn(() => ({
    toU8a: () => new Uint8Array([1, 2, 3]),
  })),
}
