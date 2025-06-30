import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BN } from '@polkadot/util'
import type { AppConfig } from 'config/apps'
import { InternalError } from '@/lib/utils'
import { AccountType, type Address, BalanceType, type MultisigAddress, type NativeBalance, TransactionStatus } from '@/state/types/ledger'
import { ledgerClient } from '../ledger'

// Mock all dependencies
vi.mock('@/lib/account', () => ({
  getApiAndProvider: vi.fn(),
  prepareTransaction: vi.fn(),
  prepareTransactionPayload: vi.fn(),
  createSignedExtrinsic: vi.fn(),
  submitAndHandleTransaction: vi.fn(),
  getTxFee: vi.fn(),
  prepareUnstakeTransaction: vi.fn(),
  prepareWithdrawTransaction: vi.fn(),
  prepareRemoveIdentityTransaction: vi.fn(),
  prepareAsMultiTx: vi.fn(),
  prepareApproveAsMultiTx: vi.fn(),
  validateCallDataMatchesHash: vi.fn(),
  prepareRemoveProxiesTransaction: vi.fn(),
  prepareRemoveAccountIndexTransaction: vi.fn(),
}))

vi.mock('@/lib/ledger/ledgerService', () => ({
  ledgerService: {
    connectDevice: vi.fn(),
    getAccountAddress: vi.fn(),
    signTransaction: vi.fn(),
  },
}))

vi.mock('@/lib/utils/balance', () => ({
  getTransferableAndNfts: vi.fn(),
}))

vi.mock('../helpers', () => ({
  validateMigrationParams: vi.fn(),
  validateAsMultiParams: vi.fn(),
  validateApproveAsMultiParams: vi.fn(),
}))

vi.mock('config/apps', () => ({
  appsConfigs: new Map([
    [
      'polkadot',
      {
        id: 'polkadot',
        name: 'Polkadot',
        rpcEndpoint: 'wss://rpc.polkadot.io',
        token: { symbol: 'DOT', decimals: 10 },
        bip44Path: "m/44'/354'/0'/0'/0'",
        ss58Prefix: 0,
      },
    ],
  ]),
  polkadotAppConfig: {
    id: 'polkadot',
    name: 'Polkadot',
    rpcEndpoint: 'wss://rpc.polkadot.io',
    token: { symbol: 'DOT', decimals: 10 },
    bip44Path: "m/44'/354'/0'/0'/0'",
    ss58Prefix: 0,
  },
}))

vi.mock('config/config', () => ({
  maxAddressesToFetch: 3,
}))

// Import mocked modules
import {
  getApiAndProvider,
  prepareTransaction,
  prepareTransactionPayload,
  createSignedExtrinsic,
  submitAndHandleTransaction,
  getTxFee,
  prepareUnstakeTransaction,
  prepareWithdrawTransaction,
  prepareRemoveIdentityTransaction,
  prepareAsMultiTx,
  prepareApproveAsMultiTx,
  validateCallDataMatchesHash,
  prepareRemoveProxiesTransaction,
  prepareRemoveAccountIndexTransaction,
} from '@/lib/account'
import { ledgerService } from '@/lib/ledger/ledgerService'
import { getTransferableAndNfts } from '@/lib/utils/balance'
import { validateMigrationParams, validateAsMultiParams, validateApproveAsMultiParams } from '../helpers'

describe('Ledger Client', () => {
  const mockApi = {
    tx: { balances: { transfer: vi.fn() } },
    rpc: { chain: { getBlockHash: vi.fn() } },
  }

  const mockAppConfig: AppConfig = {
    id: 'polkadot',
    name: 'Polkadot',
    rpcEndpoint: 'wss://rpc.polkadot.io',
    token: { symbol: 'DOT', decimals: 10 },
    bip44Path: "m/44'/354'/0'/0'/0'",
    ss58Prefix: 0,
  }

  const mockAddress: Address = {
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    path: "m/44'/354'/0'/0/0",
    pubKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
    balances: [
      {
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
    ...mockAddress,
    threshold: 2,
    members: [
      { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', internal: true },
      { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', internal: false },
    ],
    pendingMultisigCalls: [],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('connectDevice', () => {
    it('should connect device successfully', async () => {
      const mockConnectionResponse = {
        connection: { isAppOpen: true },
        error: undefined,
      }
      vi.mocked(ledgerService.connectDevice).mockResolvedValueOnce(mockConnectionResponse)

      const result = await ledgerClient.connectDevice()

      expect(result).toEqual(mockConnectionResponse)
      expect(ledgerService.connectDevice).toHaveBeenCalledOnce()
    })

    it('should handle connection error', async () => {
      vi.mocked(ledgerService.connectDevice).mockRejectedValueOnce(new Error('Connection failed'))

      await expect(ledgerClient.connectDevice()).rejects.toThrow(InternalError)
    })

    it('should pass onDisconnect callback', async () => {
      const onDisconnect = vi.fn()
      const mockConnection = { isAppOpen: true }
      vi.mocked(ledgerService.connectDevice).mockResolvedValueOnce({
        connection: mockConnection,
        error: undefined,
      })

      await ledgerClient.connectDevice(onDisconnect)

      expect(ledgerService.connectDevice).toHaveBeenCalledWith(onDisconnect)
    })
  })

  describe('synchronizeAccounts', () => {
    it('should synchronize accounts successfully', async () => {
      const mockAddresses = [
        { address: '5Address1', pubKey: '0x123', path: "m/44'/354'/0'/0/0" },
        { address: '5Address2', pubKey: '0x456', path: "m/44'/354'/0'/0/1" },
        { address: '5Address3', pubKey: '0x789', path: "m/44'/354'/0'/0/2" },
      ]

      vi.mocked(ledgerService.getAccountAddress)
        .mockResolvedValueOnce(mockAddresses[0])
        .mockResolvedValueOnce(mockAddresses[1])
        .mockResolvedValueOnce(mockAddresses[2])

      const result = await ledgerClient.synchronizeAccounts(mockAppConfig)

      expect(result).toEqual({
        result: [
          { ...mockAddresses[0], path: "m/44'/354'/0'/0'/0'" },
          { ...mockAddresses[1], path: "m/44'/354'/0'/0'/1'" },
          { ...mockAddresses[2], path: "m/44'/354'/0'/0'/2'" },
        ],
      })
      expect(ledgerService.getAccountAddress).toHaveBeenCalledTimes(3)
    })

    it('should handle partial failures in address fetching', async () => {
      const mockAddress = { address: '5Address1', pubKey: '0x123' }

      vi.mocked(ledgerService.getAccountAddress)
        .mockResolvedValueOnce(mockAddress)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Address fetch failed'))

      const result = await ledgerClient.synchronizeAccounts(mockAppConfig)

      expect(result).toEqual({
        result: [{ ...mockAddress, path: "m/44'/354'/0'/0'/0'" }],
      })
    })

    it('should handle ledger service errors', async () => {
      vi.mocked(ledgerService.getAccountAddress).mockRejectedValue(new Error('Ledger error'))

      await expect(ledgerClient.synchronizeAccounts(mockAppConfig)).rejects.toThrow(InternalError)
    })
  })

  describe('getAccountAddress', () => {
    it('should get account address successfully', async () => {
      const mockGenericAddress = {
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        pubKey: '0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d',
      }
      vi.mocked(ledgerService.getAccountAddress).mockResolvedValueOnce(mockGenericAddress)

      const result = await ledgerClient.getAccountAddress("m/44'/354'/0'/0'", 5, 0)

      expect(result).toEqual({
        result: {
          ...mockGenericAddress,
          path: "m/44'/354'/0'/5'",
        },
      })
      expect(ledgerService.getAccountAddress).toHaveBeenCalledWith("m/44'/354'/0'/5'", 0, true)
    })

    it('should handle ledger service error', async () => {
      vi.mocked(ledgerService.getAccountAddress).mockRejectedValueOnce(new Error('Address fetch failed'))

      await expect(ledgerClient.getAccountAddress("m/44'/354'/0'/0'", 5, 0)).rejects.toThrow(InternalError)
    })
  })

  describe('migrateAccount', () => {
    const mockUpdateStatus = vi.fn()

    beforeEach(() => {
      vi.mocked(validateMigrationParams).mockReturnValue({
        isValid: true,
        balance: mockAddress.balances?.[0],
        senderAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        senderPath: "m/44'/354'/0'/0/0",
        receiverAddress: '5Receiver',
        appConfig: mockAppConfig,
        multisigInfo: undefined,
        accountType: AccountType.ACCOUNT,
      })
    })

    it('should migrate account successfully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(getTransferableAndNfts).mockReturnValue({
        nftsToTransfer: [],
        nativeAmount: new BN('500000000000'),
        transferableAmount: new BN('500000000000'),
      })
      vi.mocked(prepareTransaction).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
        callData: '0xcalldata',
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })
      vi.mocked(createSignedExtrinsic).mockReturnValue(mockApi.tx.balances.transfer)
      vi.mocked(submitAndHandleTransaction).mockResolvedValueOnce()

      const result = await ledgerClient.migrateAccount('polkadot', mockAddress, mockUpdateStatus, 0)

      expect(result).toBeDefined()
      expect(result?.txPromise).toBeInstanceOf(Promise)
      expect(validateMigrationParams).toHaveBeenCalledWith('polkadot', mockAddress, 0)
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareTransaction).toHaveBeenCalled()
      expect(ledgerService.signTransaction).toHaveBeenCalled()
      expect(createSignedExtrinsic).toHaveBeenCalled()
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'polkadot',
        AccountType.ACCOUNT,
        "m/44'/354'/0'/0/0",
        BalanceType.NATIVE,
        TransactionStatus.IS_LOADING,
        'Transaction is loading',
        { callData: '0xcalldata' }
      )
    })

    it('should return undefined for invalid migration params', async () => {
      vi.mocked(validateMigrationParams).mockReturnValue({ isValid: false })

      const result = await ledgerClient.migrateAccount('polkadot', mockAddress, mockUpdateStatus, 0)

      expect(result).toBeUndefined()
      expect(getApiAndProvider).not.toHaveBeenCalled()
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      await expect(ledgerClient.migrateAccount('polkadot', mockAddress, mockUpdateStatus, 0)).rejects.toThrow(InternalError)
    })

    it('should handle transaction preparation failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(getTransferableAndNfts).mockReturnValue({
        nftsToTransfer: [],
        nativeAmount: new BN('500000000000'),
        transferableAmount: new BN('500000000000'),
      })
      vi.mocked(prepareTransaction).mockResolvedValueOnce(undefined)

      await expect(ledgerClient.migrateAccount('polkadot', mockAddress, mockUpdateStatus, 0)).rejects.toThrow(InternalError)
    })

    it('should handle signing failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(getTransferableAndNfts).mockReturnValue({
        nftsToTransfer: [],
        nativeAmount: new BN('500000000000'),
        transferableAmount: new BN('500000000000'),
      })
      vi.mocked(prepareTransaction).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: undefined,
      })

      await expect(ledgerClient.migrateAccount('polkadot', mockAddress, mockUpdateStatus, 0)).rejects.toThrow(InternalError)
    })

    it('should handle multisig accounts', async () => {
      vi.mocked(validateMigrationParams).mockReturnValue({
        isValid: true,
        balance: mockMultisigAddress.balances?.[0],
        senderAddress: '5MultisigAddress',
        senderPath: "m/44'/354'/0'/0/0",
        receiverAddress: '5Receiver',
        appConfig: mockAppConfig,
        multisigInfo: { threshold: 2, members: [] },
        accountType: AccountType.MULTISIG,
      })
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(getTransferableAndNfts).mockReturnValue({
        nftsToTransfer: [],
        nativeAmount: new BN('500000000000'),
        transferableAmount: new BN('500000000000'),
      })
      vi.mocked(prepareTransaction).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
        callData: '0xcalldata',
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })
      vi.mocked(createSignedExtrinsic).mockReturnValue(mockApi.tx.balances.transfer)
      vi.mocked(submitAndHandleTransaction).mockResolvedValueOnce()

      const result = await ledgerClient.migrateAccount('polkadot', mockMultisigAddress, mockUpdateStatus, 0)

      expect(result).toBeDefined()
      expect(mockUpdateStatus).toHaveBeenCalledWith(
        'polkadot',
        AccountType.MULTISIG,
        "m/44'/354'/0'/0/0",
        BalanceType.NATIVE,
        expect.any(String),
        expect.any(String),
        expect.any(Object)
      )
    })
  })

  describe('unstakeBalance', () => {
    const mockUpdateTxStatus = vi.fn()

    it('should unstake balance successfully', async () => {
      const amount = new BN('1000000000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareUnstakeTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })
      vi.mocked(createSignedExtrinsic).mockReturnValue(mockApi.tx.balances.transfer)
      vi.mocked(submitAndHandleTransaction).mockResolvedValueOnce()

      await ledgerClient.unstakeBalance('polkadot', mockAddress.address, mockAddress.path, amount, mockUpdateTxStatus)

      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareUnstakeTransaction).toHaveBeenCalledWith(mockApi, amount)
      expect(prepareTransactionPayload).toHaveBeenCalledWith(mockApi, mockAddress.address, mockAppConfig, mockApi.tx.balances.transfer)
      expect(ledgerService.signTransaction).toHaveBeenCalledWith(mockAddress.path, new Uint8Array([1, 2, 3]), 'dot', '0xproof')
      expect(createSignedExtrinsic).toHaveBeenCalled()
      expect(submitAndHandleTransaction).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockUpdateTxStatus, mockApi)
    })

    it('should handle missing app config', async () => {
      const amount = new BN('1000000000000')

      await expect(
        ledgerClient.unstakeBalance('nonexistent' as any, mockAddress.address, mockAddress.path, amount, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })

    it('should handle API connection failure', async () => {
      const amount = new BN('1000000000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      await expect(
        ledgerClient.unstakeBalance('polkadot', mockAddress.address, mockAddress.path, amount, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })

    it('should handle unstake transaction preparation failure', async () => {
      const amount = new BN('1000000000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareUnstakeTransaction).mockResolvedValueOnce(undefined)

      await expect(
        ledgerClient.unstakeBalance('polkadot', mockAddress.address, mockAddress.path, amount, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })

    it('should handle transaction payload preparation failure', async () => {
      const amount = new BN('1000000000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareUnstakeTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce(undefined)

      await expect(
        ledgerClient.unstakeBalance('polkadot', mockAddress.address, mockAddress.path, amount, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })

    it('should handle signing failure', async () => {
      const amount = new BN('1000000000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareUnstakeTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: undefined,
      })

      await expect(
        ledgerClient.unstakeBalance('polkadot', mockAddress.address, mockAddress.path, amount, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })
  })

  describe('getUnstakeFee', () => {
    it('should get unstake fee successfully', async () => {
      const amount = new BN('1000000000000')
      const expectedFee = new BN('50000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareUnstakeTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(getTxFee).mockResolvedValueOnce(expectedFee)

      const result = await ledgerClient.getUnstakeFee('polkadot', mockAddress.address, amount)

      expect(result).toBe(expectedFee)
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareUnstakeTransaction).toHaveBeenCalledWith(mockApi, amount)
      expect(getTxFee).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockAddress.address)
    })

    it('should handle missing app config', async () => {
      const amount = new BN('1000000000000')

      const result = await ledgerClient.getUnstakeFee('nonexistent' as any, mockAddress.address, amount)

      expect(result).toBeUndefined()
    })

    it('should handle API connection failure', async () => {
      const amount = new BN('1000000000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      const result = await ledgerClient.getUnstakeFee('polkadot', mockAddress.address, amount)

      expect(result).toBeUndefined()
    })

    it('should handle transaction preparation failure', async () => {
      const amount = new BN('1000000000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareUnstakeTransaction).mockResolvedValueOnce(undefined)

      const result = await ledgerClient.getUnstakeFee('polkadot', mockAddress.address, amount)

      expect(result).toBeUndefined()
    })

    it('should handle fee calculation error', async () => {
      const amount = new BN('1000000000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareUnstakeTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(getTxFee).mockRejectedValueOnce(new Error('Fee calculation failed'))

      const result = await ledgerClient.getUnstakeFee('polkadot', mockAddress.address, amount)

      expect(result).toBeUndefined()
    })
  })

  describe('withdrawBalance', () => {
    const mockUpdateTxStatus = vi.fn()

    it('should withdraw balance successfully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareWithdrawTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })
      vi.mocked(createSignedExtrinsic).mockReturnValue(mockApi.tx.balances.transfer)
      vi.mocked(submitAndHandleTransaction).mockResolvedValueOnce()

      await ledgerClient.withdrawBalance('polkadot', mockAddress.address, mockAddress.path, mockUpdateTxStatus)

      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareWithdrawTransaction).toHaveBeenCalledWith(mockApi)
      expect(prepareTransactionPayload).toHaveBeenCalledWith(mockApi, mockAddress.address, mockAppConfig, mockApi.tx.balances.transfer)
      expect(ledgerService.signTransaction).toHaveBeenCalledWith(mockAddress.path, new Uint8Array([1, 2, 3]), 'dot', '0xproof')
      expect(createSignedExtrinsic).toHaveBeenCalled()
      expect(submitAndHandleTransaction).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockUpdateTxStatus, mockApi)
    })

    it('should handle missing app config', async () => {
      await expect(
        ledgerClient.withdrawBalance('nonexistent' as any, mockAddress.address, mockAddress.path, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      await expect(ledgerClient.withdrawBalance('polkadot', mockAddress.address, mockAddress.path, mockUpdateTxStatus)).rejects.toThrow(
        InternalError
      )
    })

    it('should handle withdraw transaction preparation failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareWithdrawTransaction).mockResolvedValueOnce(undefined)

      await expect(ledgerClient.withdrawBalance('polkadot', mockAddress.address, mockAddress.path, mockUpdateTxStatus)).rejects.toThrow(
        InternalError
      )
    })

    it('should handle signing failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareWithdrawTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: undefined,
      })

      await expect(ledgerClient.withdrawBalance('polkadot', mockAddress.address, mockAddress.path, mockUpdateTxStatus)).rejects.toThrow(
        InternalError
      )
    })
  })

  describe('getWithdrawFee', () => {
    it('should get withdraw fee successfully', async () => {
      const expectedFee = new BN('50000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareWithdrawTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(getTxFee).mockResolvedValueOnce(expectedFee)

      const result = await ledgerClient.getWithdrawFee('polkadot', mockAddress.address)

      expect(result).toBe(expectedFee)
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareWithdrawTransaction).toHaveBeenCalledWith(mockApi)
      expect(getTxFee).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockAddress.address)
    })

    it('should handle missing app config', async () => {
      const result = await ledgerClient.getWithdrawFee('nonexistent' as any, mockAddress.address)

      expect(result).toBeUndefined()
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      const result = await ledgerClient.getWithdrawFee('polkadot', mockAddress.address)

      expect(result).toBeUndefined()
    })
  })

  describe('removeIdentity', () => {
    const mockUpdateTxStatus = vi.fn()

    it('should remove identity successfully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareRemoveIdentityTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })
      vi.mocked(createSignedExtrinsic).mockReturnValue(mockApi.tx.balances.transfer)
      vi.mocked(submitAndHandleTransaction).mockResolvedValueOnce()

      await ledgerClient.removeIdentity('polkadot', mockAddress.address, mockAddress.path, mockUpdateTxStatus)

      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareRemoveIdentityTransaction).toHaveBeenCalledWith(mockApi, mockAddress.address)
      expect(prepareTransactionPayload).toHaveBeenCalledWith(mockApi, mockAddress.address, mockAppConfig, mockApi.tx.balances.transfer)
      expect(ledgerService.signTransaction).toHaveBeenCalledWith(mockAddress.path, new Uint8Array([1, 2, 3]), 'dot', '0xproof')
      expect(createSignedExtrinsic).toHaveBeenCalled()
      expect(submitAndHandleTransaction).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockUpdateTxStatus, mockApi)
    })

    it('should handle missing app config', async () => {
      await expect(
        ledgerClient.removeIdentity('nonexistent' as any, mockAddress.address, mockAddress.path, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      await expect(ledgerClient.removeIdentity('polkadot', mockAddress.address, mockAddress.path, mockUpdateTxStatus)).rejects.toThrow(
        InternalError
      )
    })
  })

  describe('getRemoveIdentityFee', () => {
    it('should get remove identity fee successfully', async () => {
      const expectedFee = new BN('50000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareRemoveIdentityTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(getTxFee).mockResolvedValueOnce(expectedFee)

      const result = await ledgerClient.getRemoveIdentityFee('polkadot', mockAddress.address)

      expect(result).toBe(expectedFee)
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareRemoveIdentityTransaction).toHaveBeenCalledWith(mockApi, mockAddress.address)
      expect(getTxFee).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockAddress.address)
    })

    it('should handle missing app config', async () => {
      const result = await ledgerClient.getRemoveIdentityFee('nonexistent' as any, mockAddress.address)

      expect(result).toBeUndefined()
    })
  })

  describe('getMigrationTxInfo', () => {
    beforeEach(() => {
      vi.mocked(validateMigrationParams).mockReturnValue({
        isValid: true,
        balance: mockAddress.balances?.[0],
        senderAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        senderPath: "m/44'/354'/0'/0/0",
        receiverAddress: '5Receiver',
        appConfig: mockAppConfig,
        multisigInfo: undefined,
        accountType: AccountType.ACCOUNT,
      })
    })

    it('should get migration transaction info successfully', async () => {
      const expectedFee = new BN('50000000')
      const expectedCallHash = '0xcallhash'
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(getTransferableAndNfts).mockReturnValue({
        nftsToTransfer: [],
        nativeAmount: new BN('500000000000'),
        transferableAmount: new BN('500000000000'),
      })
      vi.mocked(prepareTransaction).mockResolvedValueOnce({
        transfer: {
          ...mockApi.tx.balances.transfer,
          method: {
            hash: {
              toHex: () => expectedCallHash,
            },
          },
        },
        callData: expectedCallHash,
      })
      vi.mocked(getTxFee).mockResolvedValueOnce(expectedFee)

      const result = await ledgerClient.getMigrationTxInfo('polkadot', mockAddress, 0)

      expect(result).toEqual({
        fee: expectedFee,
        callHash: expectedCallHash,
      })
      expect(validateMigrationParams).toHaveBeenCalledWith('polkadot', mockAddress, 0)
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
    })

    it('should return undefined for invalid migration params', async () => {
      vi.mocked(validateMigrationParams).mockReturnValue({ isValid: false })

      const result = await ledgerClient.getMigrationTxInfo('polkadot', mockAddress, 0)

      expect(result).toBeUndefined()
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      const result = await ledgerClient.getMigrationTxInfo('polkadot', mockAddress, 0)

      expect(result).toBeUndefined()
    })

    it('should handle transaction preparation failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(getTransferableAndNfts).mockReturnValue({
        nftsToTransfer: [],
        nativeAmount: new BN('500000000000'),
        transferableAmount: new BN('500000000000'),
      })
      vi.mocked(prepareTransaction).mockResolvedValueOnce(undefined)

      const result = await ledgerClient.getMigrationTxInfo('polkadot', mockAddress, 0)

      expect(result).toBeUndefined()
    })
  })

  describe('signApproveAsMultiTx', () => {
    const mockUpdateTxStatus = vi.fn()
    const mockFormData = {
      appId: 'polkadot' as const,
      signatoryAddress: '5Signatory',
      signatoryPath: "m/44'/354'/0'/0/1",
      callHash: '0xcallhash',
      callData: '0xcalldata',
      maxWeight: { refTime: 1000000000, proofSize: 64000 },
      maxWeightProofSize: new BN('64000'),
      maxWeightRefTime: new BN('1000000000'),
    }

    beforeEach(() => {
      vi.mocked(validateApproveAsMultiParams).mockReturnValue({
        isValid: true,
        appConfig: mockAppConfig,
        multisigInfo: { address: '5MultisigAddress', members: [], threshold: 2 },
        signerPath: "m/44'/354'/0'/0/1",
      })
    })

    it('should sign approve as multi transaction successfully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareApproveAsMultiTx).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })

      await ledgerClient.signApproveAsMultiTx(
        mockFormData.appId,
        mockMultisigAddress,
        mockFormData.callHash,
        mockFormData.signatoryAddress,
        mockUpdateTxStatus
      )

      expect(validateApproveAsMultiParams).toHaveBeenCalledWith(
        mockFormData.appId,
        mockMultisigAddress,
        mockFormData.callHash,
        mockFormData.signatoryAddress
      )
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareApproveAsMultiTx).toHaveBeenCalled()
      expect(ledgerService.signTransaction).toHaveBeenCalledWith("m/44'/354'/0'/0/1", new Uint8Array([1, 2, 3]), 'dot', '0xproof')
    })

    it('should return undefined for invalid params', async () => {
      vi.mocked(validateApproveAsMultiParams).mockReturnValue({ isValid: false })

      const result = await ledgerClient.signApproveAsMultiTx(mockFormData)

      expect(result).toBeUndefined()
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      await expect(
        ledgerClient.signApproveAsMultiTx(
          mockFormData.appId,
          mockMultisigAddress,
          mockFormData.callHash,
          mockFormData.signatoryAddress,
          mockUpdateTxStatus
        )
      ).rejects.toThrow(InternalError)
    })
  })

  describe('signAsMultiTx', () => {
    const mockUpdateTxStatus = vi.fn()
    const mockFormData = {
      appId: 'polkadot' as const,
      signatoryAddress: '5Signatory',
      signatoryPath: "m/44'/354'/0'/0/1",
      callData: '0xcalldata',
    }

    beforeEach(() => {
      vi.mocked(validateAsMultiParams).mockReturnValue({
        isValid: true,
        appConfig: mockAppConfig,
        multisigInfo: { address: '5MultisigAddress', members: [], threshold: 2 },
        signerPath: "m/44'/354'/0'/0/1",
        callData: '0xcalldata',
      })
    })

    it('should sign as multi transaction successfully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareAsMultiTx).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })

      await ledgerClient.signAsMultiTx(
        mockFormData.appId,
        mockMultisigAddress,
        '0xcallhash',
        mockFormData.callData,
        mockFormData.signatoryAddress,
        mockUpdateTxStatus
      )

      expect(validateAsMultiParams).toHaveBeenCalledWith(
        mockFormData.appId,
        mockMultisigAddress,
        '0xcallhash',
        mockFormData.callData,
        mockFormData.signatoryAddress
      )
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareAsMultiTx).toHaveBeenCalled()
      expect(ledgerService.signTransaction).toHaveBeenCalledWith("m/44'/354'/0'/0/1", new Uint8Array([1, 2, 3]), 'dot', '0xproof')
    })

    it('should return undefined for invalid params', async () => {
      vi.mocked(validateAsMultiParams).mockReturnValue({ isValid: false })

      const result = await ledgerClient.signAsMultiTx(
        mockFormData.appId,
        mockMultisigAddress,
        '0xcallhash',
        mockFormData.callData,
        mockFormData.signatoryAddress,
        mockUpdateTxStatus
      )

      expect(result).toBeUndefined()
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      await expect(
        ledgerClient.signAsMultiTx(
          mockFormData.appId,
          mockMultisigAddress,
          '0xcallhash',
          mockFormData.callData,
          mockFormData.signatoryAddress,
          mockUpdateTxStatus
        )
      ).rejects.toThrow(InternalError)
    })
  })

  describe('validateCallDataMatchesHash', () => {
    it('should validate call data matches hash successfully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(validateCallDataMatchesHash).mockResolvedValueOnce(true)

      const result = await ledgerClient.validateCallDataMatchesHash('polkadot', '0xcalldata', '0xhash')

      expect(result).toBe(true)
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(validateCallDataMatchesHash).toHaveBeenCalledWith(mockApi, '0xcalldata', '0xhash')
    })

    it('should handle missing app config', async () => {
      const result = await ledgerClient.validateCallDataMatchesHash('nonexistent' as any, '0xcalldata', '0xhash')

      expect(result).toBe(false)
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      const result = await ledgerClient.validateCallDataMatchesHash('polkadot', '0xcalldata', '0xhash')

      expect(result).toBe(false)
    })

    it('should handle validation error', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(validateCallDataMatchesHash).mockRejectedValueOnce(new Error('Validation failed'))

      const result = await ledgerClient.validateCallDataMatchesHash('polkadot', '0xcalldata', '0xhash')

      expect(result).toBe(false)
    })
  })

  describe('removeProxies', () => {
    const mockUpdateTxStatus = vi.fn()

    it('should remove proxies successfully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareRemoveProxiesTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })
      vi.mocked(createSignedExtrinsic).mockReturnValue(mockApi.tx.balances.transfer)
      vi.mocked(submitAndHandleTransaction).mockResolvedValueOnce()

      await ledgerClient.removeProxies('polkadot', mockAddress.address, mockAddress.path, mockUpdateTxStatus)

      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareRemoveProxiesTransaction).toHaveBeenCalledWith(mockApi)
      expect(prepareTransactionPayload).toHaveBeenCalledWith(mockApi, mockAddress.address, mockAppConfig, mockApi.tx.balances.transfer)
      expect(ledgerService.signTransaction).toHaveBeenCalledWith(mockAddress.path, new Uint8Array([1, 2, 3]), 'dot', '0xproof')
      expect(createSignedExtrinsic).toHaveBeenCalled()
      expect(submitAndHandleTransaction).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockUpdateTxStatus, mockApi)
    })

    it('should handle missing app config', async () => {
      await expect(
        ledgerClient.removeProxies('nonexistent' as any, mockAddress.address, mockAddress.path, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })
  })

  describe('getRemoveProxiesFee', () => {
    it('should get remove proxies fee successfully', async () => {
      const expectedFee = new BN('50000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareRemoveProxiesTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(getTxFee).mockResolvedValueOnce(expectedFee)

      const result = await ledgerClient.getRemoveProxiesFee('polkadot', mockAddress.address)

      expect(result).toBe(expectedFee)
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareRemoveProxiesTransaction).toHaveBeenCalledWith(mockApi)
      expect(getTxFee).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockAddress.address)
    })

    it('should handle missing app config', async () => {
      const result = await ledgerClient.getRemoveProxiesFee('nonexistent' as any, mockAddress.address)

      expect(result).toBeUndefined()
    })
  })

  describe('removeAccountIndex', () => {
    const mockUpdateTxStatus = vi.fn()

    it('should remove account index successfully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareRemoveAccountIndexTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(prepareTransactionPayload).mockResolvedValueOnce({
        transfer: mockApi.tx.balances.transfer,
        payload: '0xpayload',
        metadataHash: '0xhash',
        nonce: 1,
        proof1: '0xproof',
        payloadBytes: new Uint8Array([1, 2, 3]),
      })
      vi.mocked(ledgerService.signTransaction).mockResolvedValueOnce({
        signature: '0xsignature',
      })
      vi.mocked(createSignedExtrinsic).mockReturnValue(mockApi.tx.balances.transfer)
      vi.mocked(submitAndHandleTransaction).mockResolvedValueOnce()

      await ledgerClient.removeAccountIndex('polkadot', mockAddress.address, '5GTest', mockAddress.path, mockUpdateTxStatus)

      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareRemoveAccountIndexTransaction).toHaveBeenCalledWith(mockApi, '5GTest')
      expect(prepareTransactionPayload).toHaveBeenCalledWith(mockApi, mockAddress.address, mockAppConfig, mockApi.tx.balances.transfer)
      expect(ledgerService.signTransaction).toHaveBeenCalledWith(mockAddress.path, new Uint8Array([1, 2, 3]), 'dot', '0xproof')
      expect(createSignedExtrinsic).toHaveBeenCalled()
      expect(submitAndHandleTransaction).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockUpdateTxStatus, mockApi)
    })

    it('should handle missing app config', async () => {
      await expect(
        ledgerClient.removeAccountIndex('nonexistent' as any, mockAddress.address, '5GTest', mockAddress.path, mockUpdateTxStatus)
      ).rejects.toThrow(InternalError)
    })
  })

  describe('getRemoveAccountIndexFee', () => {
    it('should get remove account index fee successfully', async () => {
      const expectedFee = new BN('50000000')
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareRemoveAccountIndexTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(getTxFee).mockResolvedValueOnce(expectedFee)

      const result = await ledgerClient.getRemoveAccountIndexFee('polkadot', mockAddress.address, '5GTest')

      expect(result).toBe(expectedFee)
      expect(getApiAndProvider).toHaveBeenCalledWith('wss://rpc.polkadot.io')
      expect(prepareRemoveAccountIndexTransaction).toHaveBeenCalledWith(mockApi, '5GTest')
      expect(getTxFee).toHaveBeenCalledWith(mockApi.tx.balances.transfer, mockAddress.address)
    })

    it('should handle missing app config', async () => {
      const result = await ledgerClient.getRemoveAccountIndexFee('nonexistent' as any, mockAddress.address, '5GTest')

      expect(result).toBeUndefined()
    })

    it('should handle API connection failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      const result = await ledgerClient.getRemoveAccountIndexFee('polkadot', mockAddress.address, '5GTest')

      expect(result).toBeUndefined()
    })

    it('should handle transaction preparation failure', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareRemoveAccountIndexTransaction).mockResolvedValueOnce(undefined)

      const result = await ledgerClient.getRemoveAccountIndexFee('polkadot', mockAddress.address, '5GTest')

      expect(result).toBeUndefined()
    })

    it('should handle fee calculation error', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: mockApi })
      vi.mocked(prepareRemoveAccountIndexTransaction).mockResolvedValueOnce(mockApi.tx.balances.transfer)
      vi.mocked(getTxFee).mockRejectedValueOnce(new Error('Fee calculation failed'))

      const result = await ledgerClient.getRemoveAccountIndexFee('polkadot', mockAddress.address, '5GTest')

      expect(result).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should wrap errors with InternalError for async operations', async () => {
      vi.mocked(ledgerService.connectDevice).mockRejectedValueOnce(new Error('Connection failed'))

      await expect(ledgerClient.connectDevice()).rejects.toThrow(InternalError)
    })

    it('should include operation context in error handling', async () => {
      vi.mocked(getApiAndProvider).mockRejectedValueOnce(new Error('API connection failed'))

      await expect(ledgerClient.unstakeBalance('polkadot', mockAddress.address, mockAddress.path, new BN('1000'), vi.fn())).rejects.toThrow(
        InternalError
      )
    })

    it('should handle undefined API gracefully', async () => {
      vi.mocked(getApiAndProvider).mockResolvedValueOnce({ api: undefined })

      const result = await ledgerClient.getUnstakeFee('polkadot', mockAddress.address, new BN('1000'))

      expect(result).toBeUndefined()
    })
  })
})
