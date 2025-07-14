import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SubscanClient, SubscanError } from '../client'

// Mock global fetch
global.fetch = vi.fn()

describe('SubscanClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should construct client with network only', () => {
      const client = new SubscanClient({ network: 'polkadot' })
      expect(client).toBeInstanceOf(SubscanClient)
    })

    it('should construct client with network and API key', () => {
      const client = new SubscanClient({
        network: 'polkadot',
        apiKey: 'test-key',
      })
      expect(client).toBeInstanceOf(SubscanClient)
    })
  })

  describe('request', () => {
    it('should make successful API request', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: { test: 'data' },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const client = new SubscanClient({ network: 'polkadot' })
      const result = await client.request('/test/endpoint', { key: 'test' })

      expect(fetch).toHaveBeenCalledWith('https://polkadot.api.subscan.io/api/v2/test/endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: 'test' }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should include API key in headers when provided', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const client = new SubscanClient({
        network: 'kusama',
        apiKey: 'secret-key',
      })
      await client.request('/test/endpoint', { key: 'test' })

      expect(fetch).toHaveBeenCalledWith('https://kusama.api.subscan.io/api/v2/test/endpoint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'secret-key',
        },
        body: JSON.stringify({ key: 'test' }),
      })
    })

    it('should throw SubscanError when HTTP request fails', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const client = new SubscanClient({ network: 'polkadot' })

      await expect(client.request('/test/endpoint', { key: 'test' })).rejects.toThrow(SubscanError)

      // Test the error message by creating a new client since the previous one consumed the mock
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)
      const client2 = new SubscanClient({ network: 'polkadot' })

      await expect(client2.request('/test/endpoint', { key: 'test' })).rejects.toThrow(
        'HTTP error! status: 500, error: Internal Server Error'
      )
    })

    it('should throw SubscanError when Subscan API returns error code', async () => {
      const mockErrorResponse = {
        code: 10004,
        message: 'Record Not Found',
        generated_at: 1234567890,
      }

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockErrorResponse),
      }
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const client = new SubscanClient({ network: 'polkadot' })

      await expect(client.request('/test/endpoint', { key: 'test' })).rejects.toThrow(SubscanError)

      // Test error details with a new mock
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)
      const client2 = new SubscanClient({ network: 'polkadot' })

      try {
        await client2.request('/test/endpoint', { key: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(SubscanError)
        expect((error as SubscanError).subscanCode).toBe(10004)
        expect((error as SubscanError).httpStatus).toBe(404)
        expect(error.message).toBe('Record Not Found')
      }
    })

    it('should handle different Subscan error codes correctly', async () => {
      const testCases = [
        { code: 10001, expectedHttpStatus: 400, message: 'Invalid parameter' },
        { code: 10002, expectedHttpStatus: 400, message: 'Invalid format' },
        { code: 10003, expectedHttpStatus: 429, message: 'Rate limit exceeded' },
        { code: 10004, expectedHttpStatus: 404, message: 'Record Not Found' },
        { code: 99999, expectedHttpStatus: 500, message: 'Unknown error' },
      ]

      for (const testCase of testCases) {
        const mockErrorResponse = {
          code: testCase.code,
          message: testCase.message,
          generated_at: 1234567890,
        }

        vi.mocked(fetch).mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue(mockErrorResponse),
        } as any)

        const client = new SubscanClient({ network: 'polkadot' })

        try {
          await client.request('/test/endpoint', { key: 'test' })
          // Should not reach here
          expect(true).toBe(false)
        } catch (error) {
          expect(error).toBeInstanceOf(SubscanError)
          expect((error as SubscanError).subscanCode).toBe(testCase.code)
          expect((error as SubscanError).httpStatus).toBe(testCase.expectedHttpStatus)
          expect(error.message).toBe(testCase.message)
        }
      }
    })

    it('should handle network connection errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network connection failed'))

      const client = new SubscanClient({ network: 'polkadot' })

      await expect(client.request('/test/endpoint', { key: 'test' })).rejects.toThrow('Network connection failed')
    })

    it('should handle JSON parsing errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as any)

      const client = new SubscanClient({ network: 'polkadot' })

      await expect(client.request('/test/endpoint', { key: 'test' })).rejects.toThrow('Invalid JSON')
    })

    it('should handle different network endpoints correctly', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const networks = ['polkadot', 'kusama', 'westend', 'acala', 'moonbeam']

      for (const network of networks) {
        const client = new SubscanClient({ network })
        await client.request('/test', { key: 'test' })

        expect(fetch).toHaveBeenCalledWith(`https://${network}.api.subscan.io/api/v2/test`, expect.any(Object))
      }
    })
  })
})

describe('SubscanError', () => {
  it('should create error with correct properties', () => {
    const error = new SubscanError('Test error', 10004, 404)

    expect(error.name).toBe('SubscanError')
    expect(error.message).toBe('Test error')
    expect(error.subscanCode).toBe(10004)
    expect(error.httpStatus).toBe(404)
    expect(error).toBeInstanceOf(Error)
  })

  it('should be throwable and catchable', () => {
    expect(() => {
      throw new SubscanError('Test error', 10001, 400)
    }).toThrow(SubscanError)

    try {
      throw new SubscanError('Test error', 10001, 400)
    } catch (error) {
      expect(error).toBeInstanceOf(SubscanError)
      expect((error as SubscanError).subscanCode).toBe(10001)
    }
  })
})
