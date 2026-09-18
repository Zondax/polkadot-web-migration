import z from 'zod'
import { subscanNetworks } from '@/config/apps'

/**
 * Validates the untrusted `network` field against the Subscan network allowlist.
 * This is the security-critical check: `network` is interpolated into the
 * outbound Subscan request host, so an unvalidated value enables SSRF and
 * exfiltration of the server-side Subscan API key to an attacker host.
 */
const networkSchema = z.string().refine(value => subscanNetworks.has(value), { message: 'Unsupported network' })

/**
 * Account address as accepted by Subscan (SS58 or 0x-prefixed hex). Kept
 * permissive on charset but length-bounded to reject obviously malformed input.
 */
const addressSchema = z.string().trim().min(1, { message: 'Address is required' }).max(128, { message: 'Address is too long' })

/** Body schema for POST /api/subscan/referenda */
export const referendaRequestSchema = z.object({
  network: networkSchema,
  address: addressSchema,
  page: z.number().int().min(0).max(10_000).optional(),
  row: z.number().int().min(1).max(100).optional(),
})

/** Body schema for POST /api/subscan/search */
export const searchRequestSchema = z.object({
  network: networkSchema,
  address: addressSchema,
})

/**
 * Parses and validates a request body, returning either the typed data or a
 * flat list of human-readable error messages.
 */
export function parseRequestBody<T>(
  schema: z.ZodType<T>,
  body: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const errors = result.error.issues.map(issue => issue.message)
  return { success: false, errors }
}
