import { type NextRequest, NextResponse } from 'next/server'
import { SubscanClient, SubscanError } from '../common/client'
import { parseRequestBody, searchRequestSchema } from '../common/validation'

/**
 * Search API endpoint
 * @see https://support.subscan.io/api-5471201
 *
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = parseRequestBody(searchRequestSchema, await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.errors.join(', ') }, { status: 400 })
    }

    const { network, address } = parsed.data

    const client = new SubscanClient({
      network,
      apiKey: process.env.SUBSCAN_API_KEY,
    })

    const data = await client.request('/v2/scan/search', { key: address })

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof SubscanError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  }
}
