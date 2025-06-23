import type { AppId } from 'config/apps'
import { InternalErrors } from 'config/errors'
import { TEST_ADDRESSES, mockAddress1, mockFreeNativeBalance } from 'lib/__tests__/utils/__mocks__/mockData'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateApproveAsMultiParams, validateAsMultiParams, validateMigrationParams } from '../client/helpers'
import type { Address, AddressBalance, MultisigAddress, MultisigMember } from '../types/ledger'
import { AccountType, BalanceType } from '../types/ledger'

// Mock appsConfigs and isMultisigAddress utility
vi.mock('config/apps', async importOriginal => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    appsConfigs: {
      get: vi.fn(),
    },
  }
})

vi.mock('@/lib/utils', async importOriginal => {
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    isMultisigAddress: vi.fn(),
  }
})

// Import mocked dependencies
import { isMultisigAddress } from '@/lib/utils'
import { BN } from '@polkadot/util'
import { appsConfigs } from 'config/apps'

const mockedAppsConfigs = vi.mocked(appsConfigs)
const mockedIsMultisigAddress = vi.mocked(isMultisigAddress)

// Define all mock variables at the top level for reuse
const mockAppId: AppId = 'polkadot'
const mockAppConfig = {
  id: 'polkadot' as AppId,
  name: 'Polkadot',
  bip44Path: "m/44'/354'/0'/0'/0'",
  ss58Prefix: 0,
  rpcEndpoint: 'wss://rpc.polkadot.io',
  token: {
    symbol: 'DOT',
    decimals: 10,
  },
}
const mockCallHash = '0x1234567890abcdef'
const mockCallData = '0xabcdef1234567890'
const mockSigner = TEST_ADDRESSES.ADDRESS1

const mockMultisigMembers: MultisigMember[] = [
  { address: TEST_ADDRESSES.ADDRESS1, path: "m/44'/354'/0'/0'/0'", internal: true },
  { address: TEST_ADDRESSES.ADDRESS2, path: "m/44'/354'/0'/0'/1'", internal: false },
]
const mockMultisigAccount: MultisigAddress = {
  address: TEST_ADDRESSES.ADDRESS3,
  path: "m/44'/354'/0'/0'",
  pubKey: '0x789',
  threshold: 2,
  members: mockMultisigMembers,
  memberMultisigAddresses: undefined,
  pendingMultisigCalls: [
    { callHash: '0x1234567890abcdef', deposit: new BN(1), depositor: TEST_ADDRESSES.ADDRESS1, signatories: [TEST_ADDRESSES.ADDRESS1] },
  ],
  balances: [],
}

const mockBalance: AddressBalance = {
  type: BalanceType.NATIVE,
  balance: mockFreeNativeBalance,
  transaction: {
    destinationAddress: TEST_ADDRESSES.ADDRESS2,
    signatoryAddress: TEST_ADDRESSES.ADDRESS1,
  },
}

const mockMultisigAccountWithBalance: MultisigAddress = {
  ...mockMultisigAccount,
  balances: [mockBalance],
}

describe('client helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateMigrationParams', () => {
    describe('regular account validation', () => {
      const mockAccount: Address = {
        ...mockAddress1,
        balances: [mockBalance],
      }

      beforeEach(() => {
        mockedIsMultisigAddress.mockReturnValue(false)
        mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
      })

      it('should return valid result for successful regular account validation', () => {
        const result = validateMigrationParams(mockAppId, mockAccount, 0)

        expect(result.isValid).toBe(true)
        if (result.isValid) {
          expect(result.balance).toBe(mockBalance)
          expect(result.senderAddress).toBe(mockAccount.address)
          expect(result.senderPath).toBe(mockAccount.path)
          expect(result.receiverAddress).toBe(TEST_ADDRESSES.ADDRESS2)
          expect(result.appConfig).toBe(mockAppConfig)
          expect(result.multisigInfo).toBeUndefined()
          expect(result.accountType).toBe(AccountType.ACCOUNT)
        }
      })

      it('should return invalid when balance at index does not exist', () => {
        expect(() => validateMigrationParams(mockAppId, mockAccount, 1)).toThrow(InternalErrors.NO_BALANCE)
      })

      it('should return invalid when balances array is undefined', () => {
        const accountWithoutBalances = { ...mockAccount, balances: undefined }
        expect(() => validateMigrationParams(mockAppId, accountWithoutBalances, 0)).toThrow(InternalErrors.NO_BALANCE)
      })

      it('should throw NO_RECEIVER_ADDRESS error when destination address is missing', () => {
        const balanceWithoutDestination = {
          ...mockBalance,
          transaction: { ...mockBalance.transaction, destinationAddress: undefined },
        }
        const accountWithBadBalance = {
          ...mockAccount,
          balances: [balanceWithoutDestination],
        }

        expect(() => validateMigrationParams(mockAppId, accountWithBadBalance, 0)).toThrow(InternalErrors.NO_RECEIVER_ADDRESS)
      })

      it('should throw NO_TRANSFER_AMOUNT error when balance is not available', () => {
        const balanceWithZeroAmount = {
          ...mockBalance,
          balance: {
            free: new BN(0),
            reserved: { total: new BN(0) },
            total: new BN(0),
            transferable: new BN(0),
            frozen: new BN(0),
          },
        }
        const accountWithZeroBalance = {
          ...mockAccount,
          balances: [balanceWithZeroAmount],
        }

        expect(() => validateMigrationParams(mockAppId, accountWithZeroBalance, 0)).toThrow(InternalErrors.NO_TRANSFER_AMOUNT)
      })

      it('should throw APP_CONFIG_NOT_FOUND error when app config is missing', () => {
        mockedAppsConfigs.get.mockReturnValue(undefined)

        expect(() => validateMigrationParams(mockAppId, mockAccount, 0)).toThrow(InternalErrors.APP_CONFIG_NOT_FOUND)
      })

      it('should throw APP_CONFIG_NOT_FOUND error when app config has no rpc endpoint', () => {
        mockedAppsConfigs.get.mockReturnValue({ ...mockAppConfig, rpcEndpoint: undefined })

        expect(() => validateMigrationParams(mockAppId, mockAccount, 0)).toThrow(InternalErrors.APP_CONFIG_NOT_FOUND)
      })
    })

    describe('multisig account validation', () => {
      beforeEach(() => {
        mockedIsMultisigAddress.mockReturnValue(true)
        mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
      })

      it('should return valid result for successful multisig account validation', () => {
        const result = validateMigrationParams(mockAppId, mockMultisigAccountWithBalance, 0)
        expect(result.isValid).toBe(true)
        if (result.isValid) {
          expect(result.balance).toBe(mockBalance)
          expect(result.senderAddress).toBe(TEST_ADDRESSES.ADDRESS1)
          expect(result.senderPath).toBe("m/44'/354'/0'/0'/0'")
          expect(result.receiverAddress).toBe(TEST_ADDRESSES.ADDRESS2)
          expect(result.appConfig).toBe(mockAppConfig)
          expect(result.multisigInfo).toEqual({
            members: [TEST_ADDRESSES.ADDRESS1, TEST_ADDRESSES.ADDRESS2],
            threshold: 2,
            address: TEST_ADDRESSES.ADDRESS3,
          })
          expect(result.accountType).toBe(AccountType.MULTISIG)
        }
      })

      it('should throw NO_SIGNATORY_ADDRESS error when signatory address is missing', () => {
        const balanceWithoutSignatory = {
          ...mockBalance,
          transaction: { ...mockBalance.transaction, signatoryAddress: undefined },
        }
        const accountWithBadBalance = {
          ...mockMultisigAccountWithBalance,
          balances: [balanceWithoutSignatory],
        }

        expect(() => validateMigrationParams(mockAppId, accountWithBadBalance, 0)).toThrow(InternalErrors.NO_SIGNATORY_ADDRESS)
      })

      it('should throw NO_SIGNATORY_ADDRESS error when signatory path is not found in members', () => {
        const balanceWithUnknownSignatory = {
          ...mockBalance,
          transaction: { ...mockBalance.transaction, signatoryAddress: 'unknown_signer' },
        }
        const accountWithBadBalance = {
          ...mockMultisigAccountWithBalance,
          balances: [balanceWithUnknownSignatory],
        }

        expect(() => validateMigrationParams(mockAppId, accountWithBadBalance, 0)).toThrow(InternalErrors.NO_SIGNATORY_ADDRESS)
      })

      it('should throw NO_SIGNATORY_ADDRESS error when members are missing', () => {
        const accountWithoutMembers = { ...mockMultisigAccountWithBalance, members: undefined }
        expect(() => validateMigrationParams(mockAppId, accountWithoutMembers, 0)).toThrow(InternalErrors.NO_SIGNATORY_ADDRESS)
      })

      it('should throw NO_MULTISIG_THRESHOLD error when threshold is missing', () => {
        const accountWithoutThreshold = { ...mockMultisigAccountWithBalance, threshold: undefined }
        expect(() => validateMigrationParams(mockAppId, accountWithoutThreshold, 0)).toThrow(InternalErrors.NO_MULTISIG_THRESHOLD)
      })

      it('should throw NO_MULTISIG_ADDRESS error when address is missing', () => {
        const accountWithoutAddress = { ...mockMultisigAccountWithBalance, address: undefined as any }
        expect(() => validateMigrationParams(mockAppId, accountWithoutAddress, 0)).toThrow(InternalErrors.NO_MULTISIG_ADDRESS)
      })
    })

    describe('edge cases and error handling', () => {
      it('should handle empty balances array', () => {
        const accountWithEmptyBalances: Address = {
          ...mockAddress1,
          balances: [],
        }
        mockedIsMultisigAddress.mockReturnValue(false)

        expect(() => validateMigrationParams(mockAppId, accountWithEmptyBalances, 0)).toThrow(InternalErrors.NO_BALANCE)
      })

      it('should handle negative balance index', () => {
        const mockAccount: Address = {
          ...mockAddress1,
          balances: [mockBalance],
        }
        mockedIsMultisigAddress.mockReturnValue(false)

        expect(() => validateMigrationParams(mockAppId, mockAccount, -1)).toThrow(InternalErrors.NO_BALANCE)
      })
    })
  })

  describe('validateApproveAsMultiParams', () => {
    describe('multisig account validation', () => {
      beforeEach(() => {
        mockedIsMultisigAddress.mockReturnValue(true)
        mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
      })

      it('should return valid result for successful multisig call validation', () => {
        const result = validateApproveAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, mockSigner)

        expect(result.isValid).toBe(true)
        if (result.isValid) {
          expect(result.appConfig).toBe(mockAppConfig)
          expect(result.multisigInfo).toEqual({
            members: [TEST_ADDRESSES.ADDRESS1, TEST_ADDRESSES.ADDRESS2],
            threshold: 2,
            address: TEST_ADDRESSES.ADDRESS3,
          })
          expect(result.callHash).toBe('0x1234567890abcdef')
          expect(result.signer).toBe(TEST_ADDRESSES.ADDRESS1)
          expect(result.signerPath).toBe("m/44'/354'/0'/0'/0'")
        }
      })

      it('should throw APP_CONFIG_NOT_FOUND error when app config is missing', () => {
        mockedAppsConfigs.get.mockReturnValue(undefined)

        expect(() => validateApproveAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, mockSigner)).toThrow(
          InternalErrors.APP_CONFIG_NOT_FOUND
        )
      })

      it('should throw APP_CONFIG_NOT_FOUND error when app config has no rpc endpoint', () => {
        mockedAppsConfigs.get.mockReturnValue({ ...mockAppConfig, rpcEndpoint: undefined })

        expect(() => validateApproveAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, mockSigner)).toThrow(
          InternalErrors.APP_CONFIG_NOT_FOUND
        )
      })

      it('should throw NO_MULTISIG_MEMBERS error when members are missing', () => {
        const accountWithoutMembers = { ...mockMultisigAccount, members: undefined as any }

        expect(() => validateApproveAsMultiParams(mockAppId, accountWithoutMembers, mockCallHash, mockSigner)).toThrow(
          InternalErrors.NO_MULTISIG_MEMBERS
        )
      })

      it('should throw NO_MULTISIG_THRESHOLD error when threshold is missing', () => {
        const accountWithoutThreshold = { ...mockMultisigAccount, threshold: undefined as any }

        expect(() => validateApproveAsMultiParams(mockAppId, accountWithoutThreshold, mockCallHash, mockSigner)).toThrow(
          InternalErrors.NO_MULTISIG_THRESHOLD
        )
      })

      it('should throw NO_MULTISIG_ADDRESS error when address is missing', () => {
        const accountWithoutAddress = { ...mockMultisigAccount, address: undefined as any }

        expect(() => validateApproveAsMultiParams(mockAppId, accountWithoutAddress, mockCallHash, mockSigner)).toThrow(
          InternalErrors.NO_MULTISIG_ADDRESS
        )
      })

      it('should throw NO_SIGNATORY_ADDRESS error when signer is not found in members', () => {
        const unknownSigner = 'unknown_member'

        expect(() => validateApproveAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, unknownSigner)).toThrow(
          InternalErrors.NO_SIGNATORY_ADDRESS
        )
      })

      it('should throw NO_SIGNATORY_ADDRESS error when signer is empty', () => {
        const emptySigner = ''

        expect(() => validateApproveAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, emptySigner)).toThrow(
          InternalErrors.NO_SIGNATORY_ADDRESS
        )
      })
    })

    describe('edge cases', () => {
      beforeEach(() => {
        mockedIsMultisigAddress.mockReturnValue(true)
        mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
      })

      it('should handle empty members array', () => {
        const accountWithEmptyMembers = { ...mockMultisigAccount, members: [] }

        expect(() => validateApproveAsMultiParams(mockAppId, accountWithEmptyMembers, mockCallHash, mockSigner)).toThrow(
          InternalErrors.NO_SIGNATORY_ADDRESS
        )
      })

      it('should handle zero threshold', () => {
        const accountWithZeroThreshold = { ...mockMultisigAccount, threshold: 0 }

        expect(() => validateApproveAsMultiParams(mockAppId, accountWithZeroThreshold, mockCallHash, mockSigner)).toThrow(
          InternalErrors.NO_MULTISIG_THRESHOLD
        )
      })

      it('should handle empty call hash', () => {
        const emptyCallHash = ''
        expect(() => validateApproveAsMultiParams(mockAppId, mockMultisigAccount, emptyCallHash, mockSigner)).toThrow(
          InternalErrors.NO_PENDING_MULTISIG_CALL
        )
      })
    })
  })

  describe('validateAsMultiParams', () => {
    beforeEach(() => {
      mockedIsMultisigAddress.mockReturnValue(true)
      mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
    })
    it('should return valid result for successful multisig asMulti call validation', () => {
      const result = validateAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, mockCallData, mockSigner)
      expect(result.isValid).toBe(true)
      if (result.isValid) {
        expect(result.appConfig).toBe(mockAppConfig)
        expect(result.multisigInfo).toEqual({
          members: [TEST_ADDRESSES.ADDRESS1, TEST_ADDRESSES.ADDRESS2],
          threshold: 2,
          address: TEST_ADDRESSES.ADDRESS3,
        })
        expect(result.callHash).toBe('0x1234567890abcdef')
        expect(result.callData).toBe('0xabcdef1234567890')
        expect(result.signer).toBe(TEST_ADDRESSES.ADDRESS1)
        expect(result.signerPath).toBe("m/44'/354'/0'/0'/0'")
      }
    })
    it('should throw if callData is missing', () => {
      expect(() => validateAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, undefined, mockSigner)).toThrow(
        InternalErrors.NO_CALL_DATA
      )
    })
    it('should throw if callData is empty string', () => {
      expect(() => validateAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, '', mockSigner)).toThrow(InternalErrors.NO_CALL_DATA)
    })
    it('should throw if signer is not found in members', () => {
      expect(() => validateAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, mockCallData, 'unknown_member')).toThrow(
        InternalErrors.NO_SIGNATORY_ADDRESS
      )
    })
    it('should throw if callHash is not in pendingMultisigCalls', () => {
      expect(() => validateAsMultiParams(mockAppId, mockMultisigAccount, '0xnotfound', mockCallData, mockSigner)).toThrow(
        InternalErrors.NO_PENDING_MULTISIG_CALL
      )
    })
    it('should throw if app config is missing', () => {
      mockedAppsConfigs.get.mockReturnValue(undefined)
      expect(() => validateAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, mockCallData, mockSigner)).toThrow(
        InternalErrors.APP_CONFIG_NOT_FOUND
      )
    })
    it('should throw if app config has no rpc endpoint', () => {
      mockedAppsConfigs.get.mockReturnValue({ ...mockAppConfig, rpcEndpoint: undefined })
      expect(() => validateAsMultiParams(mockAppId, mockMultisigAccount, mockCallHash, mockCallData, mockSigner)).toThrow(
        InternalErrors.APP_CONFIG_NOT_FOUND
      )
    })
  })
})
