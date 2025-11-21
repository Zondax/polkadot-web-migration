import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../route'
import { SubscanClient, SubscanError } from '../../common/client'

// Mock the SubscanClient
vi.mock('../../common/client', () => ({
  SubscanClient: vi.fn(),
  SubscanError: class SubscanError extends Error {
    constructor(
      message: string,
      public subscanCode: number,
      public httpStatus: number
    ) {
      super(message)
      this.name = 'SubscanError'
    }
  },
}))

describe('Subscan Referenda API Route', () => {
  let mockRequest: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/subscan/referenda', () => {
    it('should return referendum data for valid request', async () => {
      const mockReferendaData = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: {
          count: 2,
          list: [
            {
              referendum_index: 617,
              title: 'Test Referendum 1',
              status: 'Decision',
            },
            {
              referendum_index: 616,
              title: 'Test Referendum 2',
              status: 'Approved',
            },
          ],
        },
      }

      const mockClientInstance = {
        request: vi.fn().mockResolvedValue(mockReferendaData),
      }

      vi.mocked(SubscanClient).mockImplementation(() => mockClientInstance as any)

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          network: 'kusama',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          page: 0,
          row: 100,
        }),
      }

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(SubscanClient).toHaveBeenCalledWith({
        network: 'kusama',
        apiKey: process.env.SUBSCAN_API_KEY,
      })
      expect(mockClientInstance.request).toHaveBeenCalledWith('/scan/referenda/referendums', {
        page: 0,
        row: 100,
        account: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      })
      expect(responseData).toEqual(mockReferendaData)
      expect(response.status).toBe(200)
    })

    it('should use default values for page and row if not provided', async () => {
      const mockReferendaData = {
        code: 0,
        message: 'Success',
        generated_at: 1234567890,
        data: { count: 0, list: [] },
      }

      const mockClientInstance = {
        request: vi.fn().mockResolvedValue(mockReferendaData),
      }

      vi.mocked(SubscanClient).mockImplementation(() => mockClientInstance as any)

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          network: 'polkadot',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        }),
      }

      const response = await POST(mockRequest)

      expect(mockClientInstance.request).toHaveBeenCalledWith('/scan/referenda/referendums', {
        page: 0,
        row: 100,
        account: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      })
      expect(response.status).toBe(200)
    })

    it('should return 400 if network is missing', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          page: 0,
          row: 100,
        }),
      }

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData).toEqual({ error: 'Network is required' })
    })

    it('should return 400 if address is missing', async () => {
      mockRequest = {
        json: vi.fn().mockResolvedValue({
          network: 'kusama',
          page: 0,
          row: 100,
        }),
      }

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData).toEqual({ error: 'Network is required' })
    })

    it('should handle SubscanError', async () => {
      const mockClientInstance = {
        request: vi.fn().mockRejectedValue(new SubscanError('Record Not Found', 10004, 404)),
      }

      vi.mocked(SubscanClient).mockImplementation(() => mockClientInstance as any)

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          network: 'kusama',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          page: 0,
          row: 100,
        }),
      }

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData).toEqual({ error: 'Record Not Found' })
    })

    it('should handle unknown errors', async () => {
      const mockClientInstance = {
        request: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      vi.mocked(SubscanClient).mockImplementation(() => mockClientInstance as any)

      mockRequest = {
        json: vi.fn().mockResolvedValue({
          network: 'kusama',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
          page: 0,
          row: 100,
        }),
      }

      const response = await POST(mockRequest)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData).toEqual({ error: 'Unknown error' })
    })
  })
})
