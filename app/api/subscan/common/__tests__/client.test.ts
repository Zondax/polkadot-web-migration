import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SubscanClient, SubscanError, resetSharedQueueManager } from '../client'

// Mock global fetch
global.fetch = vi.fn()

describe('SubscanClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    // Reset the shared queue singleton between tests to ensure test isolation
    resetSharedQueueManager()
  })

  afterEach(() => {
    vi.useRealTimers()
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
        headers: new Map(),
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const client = new SubscanClient({ network: 'polkadot' })
      const result = await client.request('/test/endpoint', { key: 'test' })

      expect(fetch).toHaveBeenCalledWith('https://polkadot.api.subscan.io/api/test/endpoint', {
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
        headers: new Map(),
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const client = new SubscanClient({
        network: 'kusama',
        apiKey: 'secret-key',
      })
      await client.request('/test/endpoint', { key: 'test' })

      expect(fetch).toHaveBeenCalledWith('https://kusama.api.subscan.io/api/test/endpoint', {
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
        headers: new Map(),
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      }
      // 500 errors are not retryable (only 502, 503, 504 are), so only 1 mock needed
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
        headers: new Map(),
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
        expect((error as Error).message).toBe('Record Not Found')
      }
    })

    it('should handle Subscan error code 10001 (Invalid parameter)', async () => {
      const mockErrorResponse = { code: 10001, message: 'Invalid parameter', generated_at: 1234567890 }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        json: vi.fn().mockResolvedValue(mockErrorResponse),
      } as any)

      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })

      try {
        await client.request('/test/endpoint', { key: 'test' })
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(SubscanError)
        expect((error as SubscanError).subscanCode).toBe(10001)
        expect((error as SubscanError).httpStatus).toBe(400)
      }
    })

    it('should handle Subscan error code 10004 (Record Not Found)', async () => {
      const mockErrorResponse = { code: 10004, message: 'Record Not Found', generated_at: 1234567890 }
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Map(),
        json: vi.fn().mockResolvedValue(mockErrorResponse),
      } as any)

      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })

      try {
        await client.request('/test/endpoint', { key: 'test' })
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(SubscanError)
        expect((error as SubscanError).subscanCode).toBe(10004)
        expect((error as SubscanError).httpStatus).toBe(404)
      }
    })

    it('should handle network connection errors', async () => {
      vi.useFakeTimers()

      // Network errors are wrapped with 503 status and retried (initial + 5 retries = 6 mocks)
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockRejectedValueOnce(new Error('Network connection failed'))
        .mockRejectedValueOnce(new Error('Network connection failed'))

      // Use API key for faster queue processing (1s interval instead of 500ms)
      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })

      // Attach catch handler immediately to avoid unhandled rejection warnings
      const requestPromise = client.request('/test/endpoint', { key: 'test' }).catch(e => e)

      // Advance timers to process all retries (need to account for both queue interval and retry delays)
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(60000)
      }

      const error = await requestPromise
      expect(error).toBeInstanceOf(SubscanError)
      expect(error.message).toBe('Network connection failed')

      vi.useRealTimers()
    })

    it('should handle JSON parsing errors', async () => {
      vi.useFakeTimers()

      // JSON parsing errors are wrapped with 503 status and retried (initial + 5 retries = 6 mocks)
      const mockResponse = {
        ok: true,
        headers: new Map(),
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      }
      vi.mocked(fetch)
        .mockResolvedValueOnce(mockResponse as any)
        .mockResolvedValueOnce(mockResponse as any)
        .mockResolvedValueOnce(mockResponse as any)
        .mockResolvedValueOnce(mockResponse as any)
        .mockResolvedValueOnce(mockResponse as any)
        .mockResolvedValueOnce(mockResponse as any)

      // Use API key for faster queue processing
      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })

      // Attach catch handler immediately to avoid unhandled rejection warnings
      const requestPromise = client.request('/test/endpoint', { key: 'test' }).catch(e => e)

      // Advance timers to process all retries
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(60000)
      }

      const error = await requestPromise
      expect(error).toBeInstanceOf(SubscanError)
      expect(error.message).toBe('Invalid JSON')

      vi.useRealTimers()
    })

    it('should handle different network endpoints correctly', async () => {
      const mockResponse = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
      }

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        headers: new Map(),
        json: vi.fn().mockResolvedValue(mockResponse),
      } as any)

      const networks = ['polkadot', 'kusama', 'westend', 'acala', 'moonbeam']

      for (const network of networks) {
        // Use API key to avoid slow queue interval (500ms -> 1s with higher concurrency)
        const client = new SubscanClient({ network, apiKey: 'test-key' })
        await client.request('/test', { key: 'test' })

        expect(fetch).toHaveBeenCalledWith(`https://${network}.api.subscan.io/api/test`, expect.any(Object))
      }
    })
  })

  describe('Rate Limiting', () => {
    it('should update rate limit info from response headers', async () => {
      const mockHeaders = new Map([
        ['ratelimit-limit', '30'],
        ['ratelimit-remaining', '25'],
        ['ratelimit-reset', '60'],
      ])

      const mockResponse = {
        ok: true,
        headers: mockHeaders,
        json: vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })
      await client.request('/test', { key: 'test' })

      const rateLimitInfo = client.getRateLimitInfo()
      expect(rateLimitInfo.limit).toBe(30)
      expect(rateLimitInfo.remaining).toBe(25)
      expect(rateLimitInfo.reset).toBe(60)
    })

    it('should adjust queue concurrency when rate limit is low (< 20%)', async () => {
      const mockHeaders = new Map([
        ['ratelimit-limit', '100'],
        ['ratelimit-remaining', '10'], // Only 10% remaining
      ])

      const mockResponse = {
        ok: true,
        headers: mockHeaders,
        json: vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      // Dynamic concurrency adjustment only happens with API key
      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })
      await client.request('/test', { key: 'test' })

      const stats = client.getQueueStats()
      expect(stats.concurrency).toBe(2) // Should be throttled down to 2
    })

    it('should adjust queue concurrency when rate limit is moderate (< 50%)', async () => {
      const mockHeaders = new Map([
        ['ratelimit-limit', '100'],
        ['ratelimit-remaining', '40'], // 40% remaining
      ])

      const mockResponse = {
        ok: true,
        headers: mockHeaders,
        json: vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      // Dynamic concurrency adjustment only happens with API key
      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })
      await client.request('/test', { key: 'test' })

      const stats = client.getQueueStats()
      expect(stats.concurrency).toBe(3) // Should be moderately throttled
    })

    it('should use default concurrency when rate limit is high (>= 50%)', async () => {
      const mockHeaders = new Map([
        ['ratelimit-limit', '100'],
        ['ratelimit-remaining', '80'], // 80% remaining
      ])

      const mockResponse = {
        ok: true,
        headers: mockHeaders,
        json: vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      // Dynamic concurrency adjustment only happens with API key
      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })
      await client.request('/test', { key: 'test' })

      const stats = client.getQueueStats()
      expect(stats.concurrency).toBe(5) // Should use default settings
    })

    it('should not adjust concurrency without API key (keeps conservative settings)', async () => {
      const mockHeaders = new Map([
        ['ratelimit-limit', '100'],
        ['ratelimit-remaining', '80'], // 80% remaining
      ])

      const mockResponse = {
        ok: true,
        headers: mockHeaders,
        json: vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 }),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)

      // Without API key, concurrency should stay at 1 regardless of rate limit headers
      const client = new SubscanClient({ network: 'polkadot' })
      await client.request('/test', { key: 'test' })

      const stats = client.getQueueStats()
      expect(stats.concurrency).toBe(1) // Should stay at conservative setting
    })

    it('should create SubscanError with retryAfter on 429 response', async () => {
      const mock429Headers = new Map([['retry-after', '5']])

      const mock429Response = {
        ok: false,
        status: 429,
        headers: mock429Headers,
        text: vi.fn().mockResolvedValue('Rate limited'),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mock429Response as any)

      const client = new SubscanClient({ network: 'polkadot' })

      try {
        await client.request('/test', { key: 'test' })
      } catch (error) {
        // Verify error has correct structure including retryAfter
        expect(error).toBeInstanceOf(SubscanError)
        expect((error as SubscanError).httpStatus).toBe(429)
        expect((error as SubscanError).subscanCode).toBe(10003)
        expect((error as SubscanError).retryAfter).toBe(5000) // 5 seconds in ms
      }
    })

    it('should respect queue limits for concurrent requests', async () => {
      const mockResponse = {
        ok: true,
        headers: new Map(),
        json: vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 }),
      }

      // Set up 10 mocks for 10 requests
      for (let i = 0; i < 10; i++) {
        vi.mocked(fetch).mockResolvedValueOnce(mockResponse as any)
      }

      // Use API key for faster queue processing
      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })

      // Make 10 concurrent requests
      const promises = Array.from({ length: 10 }, () => client.request('/test', { key: 'test' }))

      await Promise.all(promises)

      // All should succeed, but through the queue
      expect(fetch).toHaveBeenCalledTimes(10)
    })

    it('should provide queue statistics', async () => {
      const client = new SubscanClient({ network: 'polkadot' })
      const stats = client.getQueueStats()

      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('pending')
      expect(stats).toHaveProperty('concurrency')
      // Without API key: serial execution (1 req per 500ms) to avoid rate limits
      expect(stats.concurrency).toBe(1)
    })

    it('should use higher concurrency with API key', async () => {
      const client = new SubscanClient({ network: 'polkadot', apiKey: 'test-key' })
      const stats = client.getQueueStats()

      // With API key: 5 req/s allowed per Subscan free plan
      expect(stats.concurrency).toBe(5)
    })

    it('should create SubscanError with correct status on 5xx errors', async () => {
      const mock500Response = {
        ok: false,
        status: 500,
        headers: new Map(),
        text: vi.fn().mockResolvedValue('Internal Server Error'),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mock500Response as any)

      const client = new SubscanClient({ network: 'polkadot' })

      try {
        await client.request('/test', { key: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(SubscanError)
        expect((error as SubscanError).httpStatus).toBe(500)
      }
    })

    it('should handle 404 errors correctly', async () => {
      const mock404Response = {
        ok: false,
        status: 404,
        headers: new Map(),
        text: vi.fn().mockResolvedValue('Not Found'),
      }

      vi.mocked(fetch).mockResolvedValueOnce(mock404Response as any)

      const client = new SubscanClient({ network: 'polkadot' })

      try {
        await client.request('/test', { key: 'test' })
      } catch (error) {
        expect(error).toBeInstanceOf(SubscanError)
        expect((error as SubscanError).httpStatus).toBe(404)
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

  it('should create error with retryAfter property', () => {
    const error = new SubscanError('Rate limited', 10003, 429, 5000)

    expect(error.name).toBe('SubscanError')
    expect(error.message).toBe('Rate limited')
    expect(error.subscanCode).toBe(10003)
    expect(error.httpStatus).toBe(429)
    expect(error.retryAfter).toBe(5000)
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
