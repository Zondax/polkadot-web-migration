import { type NextRequest, NextResponse } from 'next/server'
import { SubscanClient, SubscanError } from '../common/client'

/**
 * Search API endpoint
 * @see https://support.subscan.io/api-5471201
 *
 */
export async function POST(request: NextRequest) {
  try {
    const { network, address } = await request.json()

    if (!network || !address) {
      return NextResponse.json({ error: 'Network and address are required' }, { status: 400 })
    }
    const client = new SubscanClient({
      network,
      apiKey: process.env.SUBSCAN_API_KEY,
    })

    const data = await client.request('/scan/search', { key: address })

    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof SubscanError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  }
}
