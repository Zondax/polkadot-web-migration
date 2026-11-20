import { Analytics } from '@vercel/analytics/react'

/**
 * Vercel Web Analytics loads /_vercel/insights/script.js, which only exists on
 * Vercel. Elsewhere (Cloudflare Workers, Docker, `next start`) the request 404s
 * and the browser logs errors, so render it only on Vercel (VERCEL=1 is set
 * there at build and run time).
 */
export function VercelAnalytics() {
  return process.env.VERCEL ? <Analytics /> : null
}
