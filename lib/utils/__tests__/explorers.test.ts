import { describe, expect, it, vi } from 'vitest'
import { ExplorerItemType } from '@/config/explorers'

// Mock dependencies
vi.mock('@/config/apps', () => ({
  getAppConfig: vi.fn((appId) => {
    const configs = {
      polkadot: {
        id: 'polkadot',
        name: 'Polkadot',
        explorer: {
          id: 'subscan',
          network: 'polkadot',
        },
      },
      kusama: {
        id: 'kusama',
        name: 'Kusama',
        explorer: {
          id: 'subscan',
          network: 'kusama',
        },
      },
      westend: {
        id: 'westend',
        name: 'Westend',
        explorer: {
          id: 'subscan',
          // No network specified, should use app.id
        },
      },
      noexplorer: {
        id: 'noexplorer',
        name: 'No Explorer',
        // No explorer config
      },
    }
    return configs[appId]
  }),
}))

vi.mock('@/config/explorers', () => ({
  ExplorerItemType: {
    Transaction: 'transaction',
    Address: 'address',
    BlockHash: 'block',
  },
  buildExplorerUrl: vi.fn((explorerId, network, type, value) => {
    // Mock implementation of buildExplorerUrl
    return `https://${network}.${explorerId}.io/${type}/${value}`
  }),
}))

import { getAddressExplorerUrl, getBlockExplorerUrl, getTransactionExplorerUrl } from '../explorers'
import { getAppConfig } from '@/config/apps'

describe('explorer utilities', () => {
  describe('getTransactionExplorerUrl', () => {
    it('should return correct URL for valid app with explorer', () => {
      const url = getTransactionExplorerUrl('polkadot', '0x1234567890abcdef')

      expect(url).toBe('https://polkadot.subscan.io/transaction/0x1234567890abcdef')
    })

    it('should use app id when network is not specified', () => {
      const url = getTransactionExplorerUrl('westend', '0xabcdef')

      expect(url).toBe('https://westend.subscan.io/transaction/0xabcdef')
    })

    it('should return empty string for app without explorer', () => {
      const url = getTransactionExplorerUrl('noexplorer', '0x1234')

      expect(url).toBe('')
    })

    it('should return empty string for invalid app', () => {
      const url = getTransactionExplorerUrl('invalid' as any, '0x1234')

      expect(url).toBe('')
    })

    it('should handle different hash formats', () => {
      const url1 = getTransactionExplorerUrl('polkadot', '0x1234567890abcdef')
      const url2 = getTransactionExplorerUrl('polkadot', '1234567890abcdef')
      const url3 = getTransactionExplorerUrl('polkadot', '0X1234567890ABCDEF')

      expect(url1).toContain('0x1234567890abcdef')
      expect(url2).toContain('1234567890abcdef')
      expect(url3).toContain('0X1234567890ABCDEF')
    })
  })

  describe('getAddressExplorerUrl', () => {
    it('should return correct URL for valid app with explorer', () => {
      const url = getAddressExplorerUrl('polkadot', '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')

      expect(url).toBe('https://polkadot.subscan.io/address/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
    })

    it('should handle different networks', () => {
      const urlPolkadot = getAddressExplorerUrl('polkadot', '5GrwvaEF')
      const urlKusama = getAddressExplorerUrl('kusama', '5GrwvaEF')

      expect(urlPolkadot).toContain('polkadot.subscan.io')
      expect(urlKusama).toContain('kusama.subscan.io')
    })

    it('should use app id when network is not specified', () => {
      const url = getAddressExplorerUrl('westend', '5GrwvaEF')

      expect(url).toBe('https://westend.subscan.io/address/5GrwvaEF')
    })

    it('should return empty string for app without explorer', () => {
      const url = getAddressExplorerUrl('noexplorer', '5GrwvaEF')

      expect(url).toBe('')
    })

    it('should return empty string for invalid app', () => {
      const url = getAddressExplorerUrl('invalid' as any, '5GrwvaEF')

      expect(url).toBe('')
    })

    it('should handle special characters in address', () => {
      const address = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      const url = getAddressExplorerUrl('polkadot', address)

      expect(url).toContain(address)
    })
  })

  describe('getBlockExplorerUrl', () => {
    it('should return correct URL for valid app with explorer', () => {
      const url = getBlockExplorerUrl('polkadot', '0xabcdef1234567890')

      expect(url).toBe('https://polkadot.subscan.io/block/0xabcdef1234567890')
    })

    it('should use app id when network is not specified', () => {
      const url = getBlockExplorerUrl('westend', '0xblock123')

      expect(url).toBe('https://westend.subscan.io/block/0xblock123')
    })

    it('should return empty string for app without explorer', () => {
      const url = getBlockExplorerUrl('noexplorer', '0xblock')

      expect(url).toBe('')
    })

    it('should return empty string for invalid app', () => {
      const url = getBlockExplorerUrl('invalid' as any, '0xblock')

      expect(url).toBe('')
    })

    it('should handle block hash with different formats', () => {
      const hash1 = '0xabcdef1234567890'
      const hash2 = 'abcdef1234567890'
      
      const url1 = getBlockExplorerUrl('polkadot', hash1)
      const url2 = getBlockExplorerUrl('polkadot', hash2)

      expect(url1).toContain(hash1)
      expect(url2).toContain(hash2)
    })

    it('should handle very long block hashes', () => {
      const longHash = '0x' + 'a'.repeat(64)
      const url = getBlockExplorerUrl('polkadot', longHash)

      expect(url).toContain(longHash)
    })
  })

  describe('edge cases', () => {
    it('should handle empty strings', () => {
      const txUrl = getTransactionExplorerUrl('polkadot', '')
      const addrUrl = getAddressExplorerUrl('polkadot', '')
      const blockUrl = getBlockExplorerUrl('polkadot', '')

      expect(txUrl).toBe('https://polkadot.subscan.io/transaction/')
      expect(addrUrl).toBe('https://polkadot.subscan.io/address/')
      expect(blockUrl).toBe('https://polkadot.subscan.io/block/')
    })

    it('should handle null app config', () => {
      vi.mocked(getAppConfig).mockReturnValueOnce(null)
      
      const url = getTransactionExplorerUrl('null' as any, '0x1234')
      
      expect(url).toBe('')
    })

    it('should handle undefined app config', () => {
      vi.mocked(getAppConfig).mockReturnValueOnce(undefined)
      
      const url = getAddressExplorerUrl('undefined' as any, '5GrwvaEF')
      
      expect(url).toBe('')
    })
  })
})