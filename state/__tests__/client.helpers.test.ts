import type { MultisigCallFormData } from '@/components/sections/migrate/dialogs/approve-multisig-call-dialog'
import type { AppId } from 'config/apps'
import { InternalErrors } from 'config/errors'
import { TEST_ADDRESSES, mockAddress1, mockFreeNativeBalance } from 'lib/__tests__/utils/__mocks__/mockData'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { validateApproveMultisigCallParams, validateMigrationParams } from '../client/helpers'
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

describe('client helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateMigrationParams', () => {
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
    const mockBalance: AddressBalance = {
      type: BalanceType.NATIVE,
      balance: mockFreeNativeBalance,
      transaction: {
        destinationAddress: TEST_ADDRESSES.ADDRESS2,
        signatoryAddress: TEST_ADDRESSES.ADDRESS1,
      },
    }

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
        const result = validateMigrationParams(mockAppId, mockAccount, 1)

        expect(result.isValid).toBe(false)
      })

      it('should return invalid when balances array is undefined', () => {
        const accountWithoutBalances = { ...mockAccount, balances: undefined }
        const result = validateMigrationParams(mockAppId, accountWithoutBalances, 0)

        expect(result.isValid).toBe(false)
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
        pendingMultisigCalls: [],
        balances: [mockBalance],
      }

      beforeEach(() => {
        mockedIsMultisigAddress.mockReturnValue(true)
        mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
      })

      it('should return valid result for successful multisig account validation', () => {
        const result = validateMigrationParams(mockAppId, mockMultisigAccount, 0)

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
          ...mockMultisigAccount,
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
          ...mockMultisigAccount,
          balances: [balanceWithUnknownSignatory],
        }

        expect(() => validateMigrationParams(mockAppId, accountWithBadBalance, 0)).toThrow(InternalErrors.NO_SIGNATORY_ADDRESS)
      })

      it('should throw NO_SIGNATORY_ADDRESS error when members are missing', () => {
        const accountWithoutMembers = { ...mockMultisigAccount, members: undefined as any }

        expect(() => validateMigrationParams(mockAppId, accountWithoutMembers, 0)).toThrow(InternalErrors.NO_SIGNATORY_ADDRESS)
      })

      it('should throw NO_MULTISIG_THRESHOLD error when threshold is missing', () => {
        const accountWithoutThreshold = { ...mockMultisigAccount, threshold: undefined as any }

        expect(() => validateMigrationParams(mockAppId, accountWithoutThreshold, 0)).toThrow(InternalErrors.NO_MULTISIG_THRESHOLD)
      })

      it('should throw NO_MULTISIG_ADDRESS error when address is missing', () => {
        const accountWithoutAddress = { ...mockMultisigAccount, address: undefined as any }

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

        const result = validateMigrationParams(mockAppId, accountWithEmptyBalances, 0)

        expect(result.isValid).toBe(false)
      })

      it('should handle negative balance index', () => {
        const mockAccount: Address = {
          ...mockAddress1,
          balances: [mockBalance],
        }
        mockedIsMultisigAddress.mockReturnValue(false)

        const result = validateMigrationParams(mockAppId, mockAccount, -1)

        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('validateApproveMultisigCallParams', () => {
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
    const mockFormData: MultisigCallFormData = {
      callHash: '0x1234567890abcdef',
      callData: '0xabcdef1234567890',
      signer: TEST_ADDRESSES.ADDRESS1,
    }

    describe('multisig account validation', () => {
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
        pendingMultisigCalls: [],
        balances: [],
      }

      beforeEach(() => {
        mockedIsMultisigAddress.mockReturnValue(true)
        mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
      })

      it('should return valid result for successful multisig call validation', () => {
        const result = validateApproveMultisigCallParams(mockAppId, mockMultisigAccount, mockFormData)

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

      it('should throw APP_CONFIG_NOT_FOUND error when app config is missing', () => {
        mockedAppsConfigs.get.mockReturnValue(undefined)

        expect(() => validateApproveMultisigCallParams(mockAppId, mockMultisigAccount, mockFormData)).toThrow(
          InternalErrors.APP_CONFIG_NOT_FOUND
        )
      })

      it('should throw APP_CONFIG_NOT_FOUND error when app config has no rpc endpoint', () => {
        mockedAppsConfigs.get.mockReturnValue({ ...mockAppConfig, rpcEndpoint: undefined })

        expect(() => validateApproveMultisigCallParams(mockAppId, mockMultisigAccount, mockFormData)).toThrow(
          InternalErrors.APP_CONFIG_NOT_FOUND
        )
      })

      it('should throw NO_MULTISIG_MEMBERS error when members are missing', () => {
        const accountWithoutMembers = { ...mockMultisigAccount, members: undefined as any }

        expect(() => validateApproveMultisigCallParams(mockAppId, accountWithoutMembers, mockFormData)).toThrow(
          InternalErrors.NO_MULTISIG_MEMBERS
        )
      })

      it('should throw NO_MULTISIG_THRESHOLD error when threshold is missing', () => {
        const accountWithoutThreshold = { ...mockMultisigAccount, threshold: undefined as any }

        expect(() => validateApproveMultisigCallParams(mockAppId, accountWithoutThreshold, mockFormData)).toThrow(
          InternalErrors.NO_MULTISIG_THRESHOLD
        )
      })

      it('should throw NO_MULTISIG_ADDRESS error when address is missing', () => {
        const accountWithoutAddress = { ...mockMultisigAccount, address: undefined as any }

        expect(() => validateApproveMultisigCallParams(mockAppId, accountWithoutAddress, mockFormData)).toThrow(
          InternalErrors.NO_MULTISIG_ADDRESS
        )
      })

      it('should throw NO_SIGNATORY_ADDRESS error when signer is not found in members', () => {
        const formDataWithUnknownSigner = { ...mockFormData, signer: 'unknown_member' }

        expect(() => validateApproveMultisigCallParams(mockAppId, mockMultisigAccount, formDataWithUnknownSigner)).toThrow(
          InternalErrors.NO_SIGNATORY_ADDRESS
        )
      })

      it('should throw NO_SIGNATORY_ADDRESS error when signer is empty', () => {
        const formDataWithEmptySigner = { ...mockFormData, signer: '' }

        expect(() => validateApproveMultisigCallParams(mockAppId, mockMultisigAccount, formDataWithEmptySigner)).toThrow(
          InternalErrors.NO_SIGNATORY_ADDRESS
        )
      })
    })

    describe('regular account validation', () => {
      const mockRegularAccount: Address = {
        ...mockAddress1,
        balances: [],
      }

      beforeEach(() => {
        mockedIsMultisigAddress.mockReturnValue(false)
        mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
      })

      it('should return invalid result for regular account', () => {
        const result = validateApproveMultisigCallParams(mockAppId, mockRegularAccount, mockFormData)

        expect(result.isValid).toBe(false)
      })
    })

    describe('edge cases', () => {
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
        pendingMultisigCalls: [],
        balances: [],
      }

      beforeEach(() => {
        mockedIsMultisigAddress.mockReturnValue(true)
        mockedAppsConfigs.get.mockReturnValue(mockAppConfig)
      })

      it('should handle empty members array', () => {
        const accountWithEmptyMembers = { ...mockMultisigAccount, members: [] }

        expect(() => validateApproveMultisigCallParams(mockAppId, accountWithEmptyMembers, mockFormData)).toThrow(
          InternalErrors.NO_SIGNATORY_ADDRESS
        )
      })

      it('should handle zero threshold', () => {
        const accountWithZeroThreshold = { ...mockMultisigAccount, threshold: 0 }

        expect(() => validateApproveMultisigCallParams(mockAppId, accountWithZeroThreshold, mockFormData)).toThrow(
          InternalErrors.NO_MULTISIG_THRESHOLD
        )
      })

      it('should handle empty call hash', () => {
        const formDataWithEmptyHash = { ...mockFormData, callHash: '' }

        const result = validateApproveMultisigCallParams(mockAppId, mockMultisigAccount, formDataWithEmptyHash)

        expect(result.isValid).toBe(true)
        if (result.isValid) {
          expect(result.callHash).toBe('')
        }
      })

      it('should handle empty call data', () => {
        const formDataWithEmptyData = { ...mockFormData, callData: '' }

        const result = validateApproveMultisigCallParams(mockAppId, mockMultisigAccount, formDataWithEmptyData)

        expect(result.isValid).toBe(true)
        if (result.isValid) {
          expect(result.callData).toBe('')
        }
      })
    })
  })
})
