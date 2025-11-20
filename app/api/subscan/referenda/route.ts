import { type NextRequest, NextResponse } from 'next/server'
import { SubscanClient, SubscanError } from '../common/client'

/**
 * Referenda API endpoint
 * @see https://docs.api.subscan.io/#referenda-referendums
 *
 */
export async function POST(request: NextRequest) {
  try {
    const { network, page = 0, row = 100, address } = await request.json()

    if (!network || !address) {
      return NextResponse.json({ error: 'Network and address are required' }, { status: 400 })
    }

    const client = new SubscanClient({
      network,
      apiKey: process.env.SUBSCAN_API_KEY,
    })

    const data = await client.request('/scan/referenda/referendums', { page, row, account: address })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof SubscanError) {
      return NextResponse.json({ error: error.message }, { status: error.httpStatus })
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 })
  }
}
