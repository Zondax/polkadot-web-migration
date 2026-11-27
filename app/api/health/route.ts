import { NextResponse } from 'next/server'

// Evaluated per request: the environment is a runtime value, not a build-time one.
export const dynamic = 'force-dynamic'

/**
 * Liveness probe for CI and deploy checks (Vercel and Cloudflare Workers).
 * DEPLOYMENT_ENV comes from wrangler.jsonc vars on Workers; Vercel sets VERCEL_ENV.
 */
export function GET() {
  return NextResponse.json(
    {
      app: 'web-migration',
      status: 'ok',
      env: process.env.DEPLOYMENT_ENV || process.env.VERCEL_ENV || 'development',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
