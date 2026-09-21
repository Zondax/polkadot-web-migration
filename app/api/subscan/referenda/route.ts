import { type NextRequest, NextResponse } from 'next/server'
import { SubscanClient, SubscanError } from '../common/client'
import { parseRequestBody, referendaRequestSchema } from '../common/validation'

/**
 * Referenda API endpoint
 * @see https://docs.api.subscan.io/#referenda-referendums
 *
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = parseRequestBody(referendaRequestSchema, await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.errors.join(', ') }, { status: 400 })
    }

    const { network, page = 0, row = 100, address } = parsed.data

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
