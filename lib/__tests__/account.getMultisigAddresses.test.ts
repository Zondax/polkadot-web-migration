import type { ApiPromise } from '@polkadot/api'
import type { StorageKey } from '@polkadot/types'
import type { Option } from '@polkadot/types-codec'
import type { Multisig } from '@polkadot/types/interfaces'
import type { AnyTuple, Codec } from '@polkadot/types/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMultisigAddresses } from '../account'
import type { SubscanMultisig } from '../subscan'

// Mock the getMultisigInfo function
vi.mock('../subscan', () => ({
  getMultisigInfo: vi.fn(),
}))

// Import the mocked function
import { getMultisigInfo } from '../subscan'

// Common mock objects
const createMockCodec = (mockToString: string, mockToHex: string): Codec =>
  ({
    toString: () => mockToString,
    toHex: () => mockToHex,
    encodedLength: 32,
    hash: () => new Uint8Array(32),
    isEmpty: false,
    registry: {},
    toJSON: () => mockToString,
    toNumber: () => 0,
    toU8a: () => new Uint8Array(32),
    eq: () => false,
    isNull: false,
    isUndefined: false,
  }) as unknown as Codec

const createMockStorageKey = (accountId: Codec, callHash: Codec): StorageKey<AnyTuple> =>
  ({
    args: [accountId, callHash],
    meta: {},
    method: 'multisigs',
    outputType: 'Option<Multisig>',
    section: 'multisig',
    toHuman: () => [accountId.toString(), callHash.toString()],
    toJSON: () => [accountId.toString(), callHash.toString()],
    toU8a: () => new Uint8Array(32),
    encodedLength: 32,
    hash: () => new Uint8Array(32),
    isEmpty: false,
    registry: {},
    eq: () => false,
    isNull: false,
    isUndefined: false,
  }) as unknown as StorageKey<AnyTuple>

const createMockMultisig = (): Option<Multisig> =>
  ({
    isSome: true,
    unwrap: () => ({
      when: {
        height: { toNumber: () => 100 },
        index: { toNumber: () => 0 },
      },
      deposit: { toNumber: () => 1000 },
      depositor: { toString: () => 'depositorAddress' },
      approvals: [{ toString: () => 'approver1' }],
    }),
  }) as unknown as Option<Multisig>

describe('getMultisigAddresses', () => {
  let mockApi: ApiPromise
  let mockAccountId: Codec
  let mockCallHash: Codec
  let mockStorageKey: StorageKey<AnyTuple>
  let mockMultisig: Option<Multisig>

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    // Create mock objects
    mockAccountId = createMockCodec('multisigAddress1', '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
    mockCallHash = createMockCodec(
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    )
    mockStorageKey = createMockStorageKey(mockAccountId, mockCallHash)
    mockMultisig = createMockMultisig()

    // Create a mock API instance
    mockApi = {
      query: {
        multisig: {
          multisigs: {
            entries: vi.fn(),
          },
        },
      },
    } as unknown as ApiPromise

    // Mock the entries function to return our mock data
    vi.mocked(mockApi.query.multisig.multisigs.entries).mockImplementation(async address => {
      if (address === 'multisigAddress1') {
        return [[mockStorageKey, mockMultisig]]
      }
      return []
    })
  })

  it('should return undefined when no multisig info is available', async () => {
    // Mock getMultisigInfo to return no multisig info
    vi.mocked(getMultisigInfo).mockResolvedValue(undefined)

    const result = await getMultisigAddresses('testAddress', 'testPath', 'kusama', mockApi)
    expect(result).toBeUndefined()
  })

  it('should return undefined when multisig info has no multi_account', async () => {
    // Mock getMultisigInfo to return empty multi_account
    vi.mocked(getMultisigInfo).mockResolvedValue({
      multi_account: [],
      threshold: 2,
      multi_account_member: [],
    } as SubscanMultisig)

    const result = await getMultisigAddresses('testAddress', 'testPath', 'kusama', mockApi)
    expect(result).toBeUndefined()
  })

  it('should return multisig addresses with member info when multi_account_member is available', async () => {
    // Mock getMultisigInfo to return complete multisig info
    vi.mocked(getMultisigInfo).mockResolvedValue({
      multi_account: [
        {
          address: 'multisigAddress1',
        },
      ],
      threshold: 2,
      multi_account_member: [
        {
          address: 'member1',
        },
        {
          address: 'testAddress',
        },
      ],
    } as SubscanMultisig)

    const result = await getMultisigAddresses('testAddress', 'testPath', 'kusama', mockApi)

    expect(result).toBeDefined()
    expect(result).toHaveLength(2)
    // as there is a multisig account, the first one is the multisig account itself
    expect(result?.[1]).toMatchObject({
      address: 'multisigAddress1',
      path: '',
      pubKey: '',
      threshold: 2,
      members: [
        {
          address: 'member1',
          internal: false,
          path: undefined,
        },
        {
          address: 'testAddress',
          internal: true,
          path: 'testPath',
        },
      ],
      pendingMultisigCalls: [
        {
          callHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          deposit: 1000,
          depositor: 'depositorAddress',
          signatories: ['approver1'],
        },
      ],
    })
  })

  it('should handle errors gracefully', async () => {
    // Mock getMultisigInfo to throw an error
    vi.mocked(getMultisigInfo).mockRejectedValue(new Error('API Error'))

    const result = await getMultisigAddresses('testAddress', 'testPath', 'kusama', mockApi)
    expect(result).toBeUndefined()
  })
})
