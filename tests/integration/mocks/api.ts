import { InternalErrors } from '@/config/errors'
import type { ApiPromise, WsProvider } from '@polkadot/api'
import { BN } from '@polkadot/util'
import { vi } from 'vitest'

// Mock API creation function for simplified API instances
export const simpleMockApi = {
  // Core properties
  genesisHash: { toHex: () => '0x123456' },
  runtimeVersion: {
    specVersion: 1000,
    transactionVersion: 1,
  },
  extrinsicVersion: 4,

  // Basic query methods
  query: {
    system: {
      account: vi.fn().mockResolvedValue({
        data: {
          free: new BN(1000000000000),
          reserved: new BN(0),
          frozen: new BN(0),
        },
      }),
    },
  },

  // Basic transaction methods
  tx: {
    balances: {
      transferKeepAlive: vi.fn().mockReturnValue({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10000000000) }),
      }),
    },
  },

  // Connection methods
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: true,
} as unknown as ApiPromise

// Mock API instance with common methods and properties
export const mockApi = {
  // Core properties
  genesisHash: { toHex: () => '0x123456' },
  runtimeVersion: {
    specVersion: 1000,
    transactionVersion: 1,
  },
  extrinsicVersion: 4,

  // Query methods
  query: {
    system: {
      account: vi.fn().mockResolvedValue({
        data: {
          free: new BN(1000000000000),
          reserved: new BN(0),
          frozen: new BN(0),
        },
      }),
    },
    staking: {
      bonded: vi.fn().mockResolvedValue({ isSome: false }),
      ledger: vi.fn().mockResolvedValue({ isEmpty: true }),
      currentEra: vi.fn().mockResolvedValue({ isSome: true, unwrap: () => ({ toString: () => '1000' }) }),
    },
    identity: {
      identityOf: vi.fn().mockResolvedValue({ isNone: true }),
    },
    multisig: {
      multisigs: vi.fn().mockResolvedValue({ isSome: false }),
    },
    proxy: {
      proxies: vi.fn().mockResolvedValue([[], { toString: () => '0' }]),
    },
    nfts: {
      account: { entries: vi.fn().mockResolvedValue([]) },
      item: vi.fn().mockResolvedValue({ toPrimitive: () => ({}) }),
      collectionMetadataOf: vi.fn().mockResolvedValue({ toPrimitive: () => ({ data: {} }) }),
    },
    uniques: {
      account: { entries: vi.fn().mockResolvedValue([]) },
      asset: vi.fn().mockResolvedValue({ toPrimitive: () => ({}) }),
      classMetadataOf: vi.fn().mockResolvedValue({ toPrimitive: () => ({ data: {} }) }),
    },
  },

  // Transaction methods
  tx: {
    balances: {
      transferKeepAlive: vi.fn().mockReturnValue({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(10000000000) }),
        method: { toHex: () => '0xbalances_transfer', hash: { toHex: () => '0xhash' } },
      }),
    },
    utility: {
      batchAll: vi.fn().mockImplementation(calls => ({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(20000000000) }),
        method: { toHex: () => '0xutility_batch', hash: { toHex: () => '0xbatchhash' } },
      })),
    },
    staking: {
      unbond: vi.fn().mockImplementation(amount => ({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(15000000000) }),
        method: { toHex: () => '0xstaking_unbond', hash: { toHex: () => '0xunbondhash' } },
      })),
      withdrawUnbonded: vi.fn().mockImplementation(numSlashingSpans => ({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(15000000000) }),
        method: { toHex: () => '0xstaking_withdraw', hash: { toHex: () => '0xwithdrawhash' } },
      })),
    },
    identity: {
      killIdentity: vi.fn().mockImplementation(address => ({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(15000000000) }),
        method: { toHex: () => '0xidentity_kill', hash: { toHex: () => '0xkillidentityhash' } },
      })),
    },
    proxy: {
      removeProxies: vi.fn().mockReturnValue({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(15000000000) }),
        method: { toHex: () => '0xproxy_remove', hash: { toHex: () => '0xremoveproxieshash' } },
      }),
    },
    nfts: {
      transfer: vi.fn().mockImplementation((collectionId, itemId, receiverAddress) => ({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(25000000000) }),
        method: { toHex: () => '0xnfts_transfer', hash: { toHex: () => '0xnftstransferhash' } },
      })),
    },
    uniques: {
      transfer: vi.fn().mockImplementation((collectionId, itemId, receiverAddress) => ({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(25000000000) }),
        method: { toHex: () => '0xuniques_transfer', hash: { toHex: () => '0xuniquestransferhash' } },
      })),
    },
    multisig: {
      approveAsMulti: vi.fn().mockImplementation((threshold, otherSignatories, maybeTimepoint, callHash, maxWeight) => ({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(30000000000) }),
        method: { toHex: () => '0xmultisig_approve', hash: { toHex: () => '0xapprovehash' } },
      })),
      asMulti: vi.fn().mockImplementation((threshold, otherSignatories, timepoint, call, maxWeight) => ({
        paymentInfo: vi.fn().mockResolvedValue({ partialFee: new BN(40000000000) }),
        method: { toHex: () => '0xmultisig_execute', hash: { toHex: () => '0xexecutehash' } },
      })),
    },
  },

  // Utility methods
  createType: vi.fn().mockImplementation((type, data) => {
    if (type === 'ExtrinsicPayload') {
      return {
        toU8a: () => new Uint8Array([1, 2, 3, 4]),
        era: { toHex: () => '0x00' },
      }
    }
    if (type === 'Call') {
      return {
        method: { toHex: () => '0xcalldata' },
        hash: { toHex: () => (data ? '0xcallhash' : '0xdefaulthash') },
      }
    }
    return { toHex: () => '0xmock' }
  }),

  // Derive methods
  derive: {
    accounts: {
      identity: vi.fn().mockResolvedValue({
        display: undefined,
        displayParent: undefined,
        parent: undefined,
      }),
    },
  },

  // Runtime methods
  call: {
    metadata: {
      metadataAtVersion: vi.fn().mockResolvedValue({
        isNone: false,
        unwrap: () => new Uint8Array([1, 2, 3, 4]),
      }),
    },
  },

  // State methods
  at: vi.fn().mockImplementation(blockHash => ({
    query: {
      system: {
        events: vi.fn().mockResolvedValue([
          {
            phase: {
              isApplyExtrinsic: true,
              asApplyExtrinsic: { eq: (index: number) => index === 0 },
            },
            event: { data: [] },
          },
        ]),
      },
    },
    events: {
      system: {
        ExtrinsicSuccess: { is: () => true },
        ExtrinsicFailed: { is: () => false },
      },
    },
    registry: {
      findMetaError: () => ({
        section: 'system',
        name: 'InvalidCall',
        docs: ['The call is invalid'],
      }),
    },
  })),

  // Connection methods
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: true,

  // For adding signatures to extrinsics
  addSignature: vi.fn().mockImplementation((address, signature, payload) => ({
    send: vi.fn().mockImplementation(callback => {
      // Simulate a successful transaction
      setTimeout(() => {
        callback({
          status: {
            isInBlock: true,
            asInBlock: { toHex: () => '0xblockhash' },
            isFinalized: true,
            asFinalized: { toHex: () => '0xfinalizedblockhash' },
          },
          events: [],
          txHash: { toHex: () => '0xtxhash' },
          txIndex: 0,
          blockNumber: 1000000,
        })
      }, 10)
      return Promise.resolve()
    }),
  })),
} as unknown as ApiPromise

// Mock WsProvider
export const mockWsProvider = {
  on: vi.fn(),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: true,
} as unknown as WsProvider
