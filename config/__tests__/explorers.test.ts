import { describe, expect, it } from 'vitest'
import { buildExplorerUrl, type ExplorerId, ExplorerItemType } from '../explorers'

describe('buildExplorerUrl', () => {
  it('should build a valid Subscan transaction URL', () => {
    const url = buildExplorerUrl('subscan', 'polkadot', ExplorerItemType.Transaction, '0x1234567890abcdef')
    expect(url).toBe('https://polkadot.subscan.io/extrinsic/0x1234567890abcdef')
  })

  it('should build a valid Subscan address URL', () => {
    const url = buildExplorerUrl('subscan', 'kusama', ExplorerItemType.Address, '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
    expect(url).toBe('https://kusama.subscan.io/account/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
  })

  it('should build a valid Subscan block URL', () => {
    const url = buildExplorerUrl('subscan', 'astar', ExplorerItemType.BlockHash, '0x1234567890abcdef')
    expect(url).toBe('https://astar.subscan.io/block/0x1234567890abcdef')
  })
  it('should return an empty string for an invalid explorer ID', () => {
    const url = buildExplorerUrl('invalid' as ExplorerId, 'polkadot', ExplorerItemType.Transaction, '0x1234567890abcdef')
    expect(url).toBe('')
  })

  it('should handle empty networks gracefully', () => {
    const url = buildExplorerUrl('subscan', '', ExplorerItemType.Transaction, '0x1234567890abcdef')
    expect(url).toBe('https://.subscan.io/extrinsic/0x1234567890abcdef')
  })
})
