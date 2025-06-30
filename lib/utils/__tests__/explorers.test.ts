import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as appsConfigModule from '@/config/apps'
import * as explorersConfigModule from '@/config/explorers'
import { ExplorerItemType } from '@/config/explorers'
import { getAddressExplorerUrl, getBlockExplorerUrl, getTransactionExplorerUrl } from '../explorers'

// Mock the config modules
vi.mock('@/config/apps', () => ({
  getAppConfig: vi.fn(),
}))

vi.mock('@/config/explorers', () => ({
  buildExplorerUrl: vi.fn(),
  ExplorerItemType: {
    Transaction: 'transaction',
    Address: 'address',
    BlockHash: 'blockHash',
    BlockNumber: 'blockNumber',
  },
  explorers: {
    subscan: {
      name: 'Subscan',
      baseUrl: 'https://{network}.subscan.io',
      txPath: '/extrinsic/{value}',
      addressPath: '/account/{value}',
      blockPath: '/block/{value}',
    },
  },
}))

describe('Explorer URL Utilities', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('getTransactionExplorerUrl', () => {
    it('should return a transaction URL when app has explorer config', () => {
      // Setup mocks
      vi.mocked(appsConfigModule.getAppConfig).mockReturnValue({
        id: 'polkadot',
        name: 'Polkadot',
        rpcEndpoint: 'wss://rpc.polkadot.io',
        explorer: {
          id: 'subscan',
          network: 'polkadot',
        },
      } as any)
      vi.mocked(explorersConfigModule.buildExplorerUrl).mockReturnValue('https://polkadot.subscan.io/extrinsic/0x123')

      const url = getTransactionExplorerUrl('polkadot', '0x123')
      expect(url).toBe('https://polkadot.subscan.io/extrinsic/0x123')
      expect(explorersConfigModule.buildExplorerUrl).toHaveBeenCalledWith('subscan', 'polkadot', ExplorerItemType.Transaction, '0x123')
    })

    it('should return empty string when app has no explorer config', () => {
      // Mock app without explorer config
      vi.mocked(appsConfigModule.getAppConfig).mockReturnValue({
        id: 'edgeware',
        name: 'Edgeware',
      } as any)

      const url = getTransactionExplorerUrl('edgeware', '0x123')
      expect(url).toBe('')
      expect(explorersConfigModule.buildExplorerUrl).not.toHaveBeenCalled()
    })
  })

  describe('getAddressExplorerUrl', () => {
    it('should return an address URL when app has explorer config', () => {
      // Setup mocks
      vi.mocked(appsConfigModule.getAppConfig).mockReturnValue({
        id: 'kusama',
        name: 'Kusama',
        rpcEndpoint: 'wss://kusama-rpc.polkadot.io',
        explorer: {
          id: 'subscan',
          network: 'kusama',
        },
      } as any)
      vi.mocked(explorersConfigModule.buildExplorerUrl).mockReturnValue('https://kusama.subscan.io/account/5ABC')

      const url = getAddressExplorerUrl('kusama', '5ABC')
      expect(url).toBe('https://kusama.subscan.io/account/5ABC')
      expect(explorersConfigModule.buildExplorerUrl).toHaveBeenCalledWith('subscan', 'kusama', ExplorerItemType.Address, '5ABC')
    })

    it('should handle empty explorer config gracefully', () => {
      vi.mocked(appsConfigModule.getAppConfig).mockReturnValue({
        id: 'test-chain',
        name: 'Test Chain',
        rpcEndpoint: undefined,
      } as any)

      const url = getAddressExplorerUrl('test-chain', '5ABC')
      expect(url).toBe('')
      expect(explorersConfigModule.buildExplorerUrl).not.toHaveBeenCalled()
    })
  })

  describe('getBlockExplorerUrl', () => {
    it('should return a block URL when app has explorer config', () => {
      // Setup mocks
      vi.mocked(appsConfigModule.getAppConfig).mockReturnValue({
        id: 'astar',
        name: 'Astar',
        rpcEndpoint: 'wss://rpc.astar.network',
        explorer: {
          id: 'subscan',
          network: 'astar',
        },
      } as any)
      vi.mocked(explorersConfigModule.buildExplorerUrl).mockReturnValue('https://astar.subscan.io/block/123456')

      const url = getBlockExplorerUrl('astar', '123456')
      expect(url).toBe('https://astar.subscan.io/block/123456')
      expect(explorersConfigModule.buildExplorerUrl).toHaveBeenCalledWith('subscan', 'astar', ExplorerItemType.BlockHash, '123456')
    })

    it('should return empty string for app without explorer config', () => {
      // Mock app without explorer config
      vi.mocked(appsConfigModule.getAppConfig).mockReturnValue({
        id: 'parallel',
        name: 'Parallel',
      } as any)

      const url = getBlockExplorerUrl('parallel', '123456')
      expect(url).toBe('')
      expect(explorersConfigModule.buildExplorerUrl).not.toHaveBeenCalled()
    })
  })
})
