import { type NextRequest, NextResponse } from 'next/server'
import { SubscanClient, SubscanError } from '../common/client'

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('Content-Security-Policy', "default-src 'self'; object-src 'none'; base-uri 'self'")
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}

/**
 * Input validation for API parameters
 */
function validateInput(network: string, address: string): { isValid: boolean; error?: string } {
  // Network validation
  if (!network || typeof network !== 'string') {
    return { isValid: false, error: 'Network parameter is required and must be a string' }
  }

  // Check for SQL injection patterns
  const sqlPatterns = [
    /('|(\\')|(;)|(\\;)|(\||\\|)|(\*|\\\*))/i,
    /((%27)|('))\s*((%6F)|o|(%4F))((%72)|r|(%52))/i,
    /\w*((%27)|('))((%6F)|o|(%4F))((%72)|r|(%52))/i,
    /((%27)|('))\s*union/i,
    /union[\s]+select/i,
    /select[\s]+[\w*,\s]+from[\s]+[\w]+/i
  ]

  // Check for XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<svg/gi,
    /<img[^>]+src[^>]*>/gi
  ]

  // Test network against malicious patterns
  const allPatterns = [...sqlPatterns, ...xssPatterns]
  if (allPatterns.some(pattern => pattern.test(network))) {
    return { isValid: false, error: 'Invalid network parameter detected' }
  }

  // Network allowlist
  const allowedNetworks = [
    'polkadot', 'kusama', 'westend', 'acala', 'karura', 'moonbeam', 'moonriver',
    'astar', 'shiden', 'bifrost', 'hydradx', 'centrifuge', 'parallel',
    'assethub-polkadot', 'assethub-kusama', 'collectives-polkadot'
  ]

  if (!allowedNetworks.includes(network.toLowerCase())) {
    return { isValid: false, error: 'Unsupported network' }
  }

  // Address validation
  if (!address || typeof address !== 'string') {
    return { isValid: false, error: 'Address parameter is required and must be a string' }
  }

  // Test address against malicious patterns
  if (allPatterns.some(pattern => pattern.test(address))) {
    return { isValid: false, error: 'Invalid address format detected' }
  }

  // Basic Substrate address format check
  if (!/^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address)) {
    return { isValid: false, error: 'Invalid address format' }
  }

  // Size limits
  if (network.length > 50 || address.length > 100) {
    return { isValid: false, error: 'Input too large' }
  }

  return { isValid: true }
}

/**
 * Search API endpoint
 * @see https://support.subscan.io/api-5471201
 *
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with size limit
    const body = await request.json()
    const { network, address } = body

    // Validate request size
    const requestSize = JSON.stringify(body).length
    if (requestSize > 10000) { // 10KB limit
      const response = NextResponse.json({ error: 'Request too large' }, { status: 413 })
      return addSecurityHeaders(response)
    }

    // Basic parameter check
    if (!network || !address) {
      const response = NextResponse.json({ error: 'Network and address are required' }, { status: 400 })
      return addSecurityHeaders(response)
    }

    // Security validation
    const validation = validateInput(network, address)
    if (!validation.isValid) {
      const response = NextResponse.json({ error: validation.error }, { status: 400 })
      return addSecurityHeaders(response)
    }
    const client = new SubscanClient({
      network,
      apiKey: process.env.SUBSCAN_API_KEY,
    })

    const data = await client.request('/scan/search', { key: address })

    const response = NextResponse.json(data)
    return addSecurityHeaders(response)
  } catch (error) {
    if (error instanceof SubscanError) {
      const response = NextResponse.json({ error: error.message }, { status: error.httpStatus })
      return addSecurityHeaders(response)
    }
    const response = NextResponse.json({ error: 'Unknown error' }, { status: 500 })
    return addSecurityHeaders(response)
  }
}
