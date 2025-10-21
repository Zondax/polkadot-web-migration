import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMultisigInfo, type SubscanMultisig } from '../subscan'

// Mock global fetch
global.fetch = vi.fn()

describe('Subscan Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getMultisigInfo', () => {
    const testAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
    const testNetwork = 'polkadot'

    it('should return multisig info when account has multisig data', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: {
          account: {
            address: testAddress,
            multisig: {
              multi_account: [
                { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' },
                { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' },
                { address: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW' },
              ],
              multi_account_member: [
                { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' },
                { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' },
              ],
              threshold: 2,
            },
          },
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await getMultisigInfo(testAddress, testNetwork)

      expect(fetch).toHaveBeenCalledWith('/api//subscan/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: testNetwork,
          address: testAddress,
        }),
      })

      expect(result).toEqual({
        multi_account: [
          { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' },
          { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' },
          { address: '5DAAnrj7VHTznn2C221g2pvCnvVy9AHbLP7RP9ueGZFg7AAW' },
        ],
        multi_account_member: [
          { address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' },
          { address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' },
        ],
        threshold: 2,
      })
    })

    it('should return undefined when account has no multisig data', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: {
          account: {
            address: testAddress,
            // No multisig data
          },
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await getMultisigInfo(testAddress, testNetwork)

      expect(result).toBeUndefined()
    })

    it('should return undefined when account data is missing', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: {
          // No account data
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await getMultisigInfo(testAddress, testNetwork)

      expect(result).toBeUndefined()
    })

    it('should handle HTTP errors from API', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as any)

      await expect(getMultisigInfo(testAddress, testNetwork)).rejects.toThrow('HTTP error! status: 404')
    })

    it('should handle network connection errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network connection failed'))

      await expect(getMultisigInfo(testAddress, testNetwork)).rejects.toThrow('Network connection failed')
    })

    it('should handle JSON parsing errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any)

      await expect(getMultisigInfo(testAddress, testNetwork)).rejects.toThrow('Invalid JSON')
    })

    it('should work with different networks', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: { account: { address: testAddress } },
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const networks = ['polkadot', 'kusama', 'westend', 'acala']

      for (const network of networks) {
        await getMultisigInfo(testAddress, network)

        expect(fetch).toHaveBeenCalledWith('/api//subscan/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            network,
            address: testAddress,
          }),
        })
      }
    })

    it('should handle empty multisig arrays', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: {
          account: {
            address: testAddress,
            multisig: {
              multi_account: [],
              multi_account_member: [],
              threshold: 0,
            },
          },
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await getMultisigInfo(testAddress, testNetwork)

      expect(result).toEqual({
        multi_account: [],
        multi_account_member: [],
        threshold: 0,
      })
    })

    it('should handle partial multisig data', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: {
          account: {
            address: testAddress,
            multisig: {
              multi_account: [{ address: testAddress }],
              multi_account_member: [],
              threshold: 1,
            },
          },
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await getMultisigInfo(testAddress, testNetwork)

      expect(result).toEqual({
        multi_account: [{ address: testAddress }],
        multi_account_member: [],
        threshold: 1,
      })
    })

    it('should handle different address formats', async () => {
      const addresses = [
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY', // Polkadot format
        'CxDDSH8gS7jecsxaRL9Txf8H5kqesLXAEAEgp76Yz632J9M', // Kusama format
        '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty', // Another format
      ]

      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: { account: { address: 'test' } },
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      for (const address of addresses) {
        await getMultisigInfo(address, testNetwork)

        expect(fetch).toHaveBeenCalledWith('/api//subscan/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            network: testNetwork,
            address,
          }),
        })
      }
    })

    it('should handle server errors gracefully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as any)

      await expect(getMultisigInfo(testAddress, testNetwork)).rejects.toThrow('HTTP error! status: 500')
    })

    it('should handle malformed API responses', async () => {
      const malformedResponse = {
        // Missing required fields like 'data'
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: undefined, // This will cause the error
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(malformedResponse),
      } as any)

      // Should throw due to accessing properties on undefined data
      await expect(getMultisigInfo(testAddress, testNetwork)).rejects.toThrow()
    })

    it('should handle responses with null data', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: null,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      await expect(getMultisigInfo(testAddress, testNetwork)).rejects.toThrow() // Should throw due to accessing properties on null
    })
  })

  describe('SubscanMultisig interface', () => {
    it('should have correct interface structure', () => {
      const multisig: SubscanMultisig = {
        multi_account: [{ address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }],
        multi_account_member: [{ address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty' }],
        threshold: 2,
      }

      expect(multisig.multi_account).toBeDefined()
      expect(multisig.multi_account_member).toBeDefined()
      expect(multisig.threshold).toBeDefined()
      expect(typeof multisig.threshold).toBe('number')
      expect(Array.isArray(multisig.multi_account)).toBe(true)
      expect(Array.isArray(multisig.multi_account_member)).toBe(true)
    })
  })
})
