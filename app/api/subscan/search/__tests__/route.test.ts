import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '../route'
import { SubscanError } from '../../common/client'

// Mock NextRequest
const mockNextRequest = (body: any): NextRequest => {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest
}

// Mock the SubscanClient
vi.mock('../../common/client', () => {
  const SubscanError = class extends Error {
    constructor(
      message: string,
      public subscanCode: number,
      public httpStatus: number
    ) {
      super(message)
      this.name = 'SubscanError'
    }
  }

  const SubscanClient = vi.fn().mockImplementation(() => ({
    request: vi.fn(),
  }))

  return {
    SubscanClient,
    SubscanError,
  }
})

// Mock environment variables
const originalEnv = process.env.SUBSCAN_API_KEY
beforeEach(() => {
  vi.clearAllMocks()
  process.env.SUBSCAN_API_KEY = 'test-api-key'
})

afterEach(() => {
  process.env.SUBSCAN_API_KEY = originalEnv
})

describe('/api/subscan/search/route', () => {
  describe('POST', () => {
    it('should return 400 when network is missing', async () => {
      const request = mockNextRequest({ address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Network and address are required')
    })

    it('should return 400 when address is missing', async () => {
      const request = mockNextRequest({ network: 'polkadot' })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Network and address are required')
    })

    it('should return 400 when both network and address are missing', async () => {
      const request = mockNextRequest({})

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Network and address are required')
    })

    it('should successfully process valid request', async () => {
      const mockSubscanData = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: {
          account: {
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
            display: '5GrwvaEF...HGKutQY',
          },
        },
      }

      const { SubscanClient } = await import('../../common/client')
      const mockRequest = vi.fn().mockResolvedValue(mockSubscanData)
      vi.mocked(SubscanClient).mockImplementation(() => ({
        request: mockRequest,
      }) as any)

      const request = mockNextRequest({
        network: 'polkadot',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSubscanData)
      expect(mockRequest).toHaveBeenCalledWith('/scan/search', {
        key: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      })
    })

    it('should handle SubscanError with custom status', async () => {
      const { SubscanClient } = await import('../../common/client')
      const mockRequest = vi.fn().mockRejectedValue(
        new SubscanError('Record not found', 10004, 404)
      )
      vi.mocked(SubscanClient).mockImplementation(() => ({
        request: mockRequest,
      }) as any)

      const request = mockNextRequest({
        network: 'polkadot',
        address: '5InvalidAddress',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Record not found')
    })

    it('should handle SubscanError with rate limit', async () => {
      const { SubscanClient } = await import('../../common/client')
      const mockRequest = vi.fn().mockRejectedValue(
        new SubscanError('Rate limit exceeded', 10003, 429)
      )
      vi.mocked(SubscanClient).mockImplementation(() => ({
        request: mockRequest,
      }) as any)

      const request = mockNextRequest({
        network: 'polkadot',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
    })

    it('should handle unknown errors with 500 status', async () => {
      const { SubscanClient } = await import('../../common/client')
      const mockRequest = vi.fn().mockRejectedValue(new Error('Unknown network error'))
      vi.mocked(SubscanClient).mockImplementation(() => ({
        request: mockRequest,
      }) as any)

      const request = mockNextRequest({
        network: 'polkadot',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unknown error')
    })

    it('should handle malformed JSON in request', async () => {
      const request = {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unknown error')
    })

    it('should pass API key to SubscanClient when available', async () => {
      process.env.SUBSCAN_API_KEY = 'custom-api-key'

      const { SubscanClient } = await import('../../common/client')
      const mockRequest = vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 })
      vi.mocked(SubscanClient).mockImplementation(() => ({
        request: mockRequest,
      }) as any)

      const request = mockNextRequest({
        network: 'kusama',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      })

      await POST(request)

      expect(SubscanClient).toHaveBeenCalledWith({
        network: 'kusama',
        apiKey: 'custom-api-key',
      })
    })

    it('should handle missing API key gracefully', async () => {
      delete process.env.SUBSCAN_API_KEY

      const { SubscanClient } = await import('../../common/client')
      const mockRequest = vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 })
      vi.mocked(SubscanClient).mockImplementation(() => ({
        request: mockRequest,
      }) as any)

      const request = mockNextRequest({
        network: 'polkadot',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      })

      await POST(request)

      expect(SubscanClient).toHaveBeenCalledWith({
        network: 'polkadot',
        apiKey: undefined,
      })
    })

    it('should handle different network names', async () => {
      const { SubscanClient } = await import('../../common/client')
      const mockRequest = vi.fn().mockResolvedValue({ code: 0, message: 'Success', generated_at: 123 })
      vi.mocked(SubscanClient).mockImplementation(() => ({
        request: mockRequest,
      }) as any)

      const testCases = ['polkadot', 'kusama', 'westend', 'acala']

      for (const network of testCases) {
        const request = mockNextRequest({
          network,
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        })

        await POST(request)

        expect(SubscanClient).toHaveBeenCalledWith({
          network,
          apiKey: 'test-api-key',
        })
      }
    })
  })
})