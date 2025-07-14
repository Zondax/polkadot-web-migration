import type { ApiPromise } from '@polkadot/api'
import type { ProxyDefinition } from '@polkadot/types/interfaces'
import type { u128, Vec } from '@polkadot/types-codec'
import { BN } from '@polkadot/util'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProxyInfo } from '../account'

const mockAddress = '5FakeAddress1234567890'

function createApiMock({ proxies, deposit }: { proxies?: Vec<ProxyDefinition>; deposit?: u128 }) {
  return {
    query: {
      proxy: {
        proxies: vi.fn().mockResolvedValue([proxies, deposit]),
      },
    },
  } as unknown as ApiPromise
}

describe('getProxyInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns undefined when there is an error', async () => {
    const api = createApiMock({})
    vi.spyOn(api.query.proxy, 'proxies').mockRejectedValueOnce(new Error('API Error'))
    const result = await getProxyInfo(mockAddress, api)
    expect(result).toBeUndefined()
  })

  it('returns empty proxy info when no proxies exist', async () => {
    const proxies = {
      toHuman: () => [],
    } as unknown as Vec<ProxyDefinition>
    const deposit = { toString: () => '0' } as unknown as u128
    const api = createApiMock({ proxies, deposit })
    const result = await getProxyInfo(mockAddress, api)
    expect(result).toEqual({
      proxies: [],
      deposit: new BN(0),
    })
  })

  it('returns proxy info with a single proxy', async () => {
    const proxies = {
      toHuman: () => [
        {
          proxyType: 'Any',
          delegate: '5FakeDelegate1234567890',
          delay: '0',
        },
      ],
    } as unknown as Vec<ProxyDefinition>
    const deposit = { toString: () => '1000000000000' } as unknown as u128
    const api = createApiMock({ proxies, deposit })
    const result = await getProxyInfo(mockAddress, api)
    expect(result).toEqual({
      proxies: [
        {
          type: 'Any',
          address: '5FakeDelegate1234567890',
          delay: '0',
        },
      ],
      deposit: new BN(1000000000000),
    })
  })

  it('returns proxy info with multiple proxies', async () => {
    const proxies = {
      toHuman: () => [
        {
          proxyType: 'Any',
          delegate: '5FakeDelegate1234567890',
          delay: '0',
        },
        {
          proxyType: 'Staking',
          delegate: '5FakeDelegate0987654321',
          delay: '10',
        },
        {
          proxyType: 'Governance',
          delegate: '5FakeDelegate5678901234',
          delay: '5',
        },
      ],
    } as unknown as Vec<ProxyDefinition>
    const deposit = { toString: () => '2000000000000' } as unknown as u128
    const api = createApiMock({ proxies, deposit })
    const result = await getProxyInfo(mockAddress, api)
    expect(result).toEqual({
      proxies: [
        {
          type: 'Any',
          address: '5FakeDelegate1234567890',
          delay: '0',
        },
        {
          type: 'Staking',
          address: '5FakeDelegate0987654321',
          delay: '10',
        },
        {
          type: 'Governance',
          address: '5FakeDelegate5678901234',
          delay: '5',
        },
      ],
      deposit: new BN(2000000000000),
    })
  })

  it('handles proxies with different delay formats', async () => {
    const proxies = {
      toHuman: () => [
        {
          proxyType: 'Any',
          delegate: '5FakeDelegate1234567890',
          delay: '0',
        },
        {
          proxyType: 'Staking',
          delegate: '5FakeDelegate0987654321',
          delay: '10',
        },
        {
          proxyType: 'Governance',
          delegate: '5FakeDelegate5678901234',
          delay: '5',
        },
      ],
    } as unknown as Vec<ProxyDefinition>
    const deposit = { toString: () => '1000000000000' } as unknown as u128
    const api = createApiMock({ proxies, deposit })
    const result = await getProxyInfo(mockAddress, api)
    expect(result).toEqual({
      proxies: [
        {
          type: 'Any',
          address: '5FakeDelegate1234567890',
          delay: '0',
        },
        {
          type: 'Staking',
          address: '5FakeDelegate0987654321',
          delay: '10',
        },
        {
          type: 'Governance',
          address: '5FakeDelegate5678901234',
          delay: '5',
        },
      ],
      deposit: new BN(1000000000000),
    })
  })
})
