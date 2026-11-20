#!/usr/bin/env node
/**
 * HTTP parity smoke for the migration app, run against either build with the same checks:
 *   node tools/check-worker.mjs http://127.0.0.1:3300   # vinext Worker (pnpm preview:cf)
 *   node tools/check-worker.mjs http://127.0.0.1:3000   # Next (next start)
 *
 * Covers every page under app/, 404s, the next.config.ts security headers (pages and public/ files),
 * client assets, /api/health and the input validation of the Subscan proxy routes (the SSRF allowlist).
 * Exits non-zero on any failure.
 */
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const base = (process.argv[2] ?? 'http://127.0.0.1:3300').replace(/\/$/, '')
const results = []

function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
}

function get(path, init = {}) {
  return fetch(base + path, { redirect: 'manual', signal: AbortSignal.timeout(30_000), ...init })
}

const postJson = (path, body) => get(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

/** Page routes from app/ (directories holding a page.tsx), as URL paths. Route groups are dropped. */
function pageRoutes() {
  const dir = join(root, 'app')
  const walk = d =>
    readdirSync(d).flatMap(name => {
      const p = join(d, name)
      if (statSync(p).isDirectory()) return name === 'api' || name.startsWith('_') || name.includes('__tests__') ? [] : walk(p)
      return /^page\.(tsx|ts|jsx|js)$/.test(name) ? [dirname(p)] : []
    })
  return walk(dir)
    .map(p =>
      relative(dir, p)
        .split(sep)
        .filter(s => s && !/^\(.*\)$/.test(s))
    )
    .map(segments => `/${segments.join('/')}`)
    .sort()
}

/** Headers next.config.ts sets on every path, which both builds must send. */
function checkSecurityHeaders(label, res) {
  const csp = res.headers.get('content-security-policy') ?? ''
  record(
    `${label} has the security headers`,
    /default-src 'self'/.test(csp) &&
      /'wasm-unsafe-eval'/.test(csp) &&
      res.headers.get('x-frame-options') === 'DENY' &&
      res.headers.get('x-content-type-options') === 'nosniff' &&
      /hid=\(self\)/.test(res.headers.get('permissions-policy') ?? '') &&
      /max-age=/.test(res.headers.get('strict-transport-security') ?? ''),
    `csp=${csp.slice(0, 40)}… x-frame-options=${res.headers.get('x-frame-options')}`
  )
}

async function main() {
  const health = await get('/api/health')
  const healthBody = health.ok ? await health.json() : {}
  record(
    'GET /api/health',
    health.status === 200 &&
      healthBody.app === 'web-migration' &&
      healthBody.status === 'ok' &&
      typeof healthBody.env === 'string' &&
      /no-store/.test(health.headers.get('cache-control') ?? ''),
    `${health.status} ${JSON.stringify(healthBody)} cache-control=${health.headers.get('cache-control')}`
  )

  const routes = pageRoutes()
  record('app/ has pages', routes.includes('/') && routes.includes('/migrate'), routes.join(' '))
  for (const route of routes) {
    const res = await get(route)
    record(`GET ${route}`, res.status === 200 && /text\/html/.test(res.headers.get('content-type') ?? ''), String(res.status))
    checkSecurityHeaders(route, res)
  }

  for (const path of ['/this/route/does-not-exist', '/api/does-not-exist']) {
    const res = await get(path)
    record(`GET ${path} → 404`, res.status === 404, String(res.status))
  }

  const home = await (await get('/')).text()
  record('/ SSR has the title', /<title[^>]*>Polkadot Migration<\/title>/.test(home))
  record('/ SSR renders the hero', /Welcome to the Polkadot Ledger Migration Assistant/.test(home))
  record('/ SSR has no Vercel analytics outside Vercel', !home.includes('/_vercel/insights'))
  const migrate = await (await get('/migrate')).text()
  record('/migrate SSR renders the Connect step', /Connect Your Device/.test(migrate))

  const script = home.match(/<script[^>]+src="([^"]+\.js)"/)?.[1]
  if (script) {
    const asset = await get(new URL(script, `${base}/`).pathname)
    record(
      'client script is served as JavaScript',
      asset.status === 200 && /javascript/.test(asset.headers.get('content-type') ?? ''),
      `${script} → ${asset.status} ${asset.headers.get('content-type')}`
    )
  } else {
    record('/ references a client script', false)
  }
  const css = home.match(/<link[^>]+href="([^"]+\.css)"/)?.[1]
  record('/ references a stylesheet', Boolean(css))

  const logoName = readdirSync(join(root, 'public', 'logos', 'chains')).find(name => name.endsWith('.svg'))
  const logo = await get(`/logos/chains/${logoName}`)
  record(`GET /logos/chains/${logoName}`, logo.status === 200 && /svg/.test(logo.headers.get('content-type') ?? ''), String(logo.status))
  checkSecurityHeaders('public/ file', logo)

  // Subscan proxy: POST only, and the network must be on the allowlist (it is interpolated into the upstream host,
  // which carries the API key). None of these reach Subscan.
  for (const path of ['/api/subscan/search', '/api/subscan/referenda']) {
    const getRes = await get(path)
    record(`GET ${path} → 405`, getRes.status === 405, String(getRes.status))
    const ssrf = await postJson(path, { network: 'evil.example.com#', address: '1' })
    const ssrfBody = await ssrf.json().catch(() => ({}))
    record(
      `POST ${path} rejects a network off the allowlist → 400`,
      ssrf.status === 400 && /Unsupported network/.test(ssrfBody.error ?? ''),
      `${ssrf.status} ${JSON.stringify(ssrfBody)}`
    )
    const noAddress = await postJson(path, { network: 'polkadot', address: '' })
    record(`POST ${path} without address → 400`, noAddress.status === 400, String(noAddress.status))
  }

  const failed = results.filter(r => !r.ok)
  for (const r of results) {
    process.stdout.write(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : `  — ${r.detail}`}\n`)
  }
  process.stdout.write(`\n${results.length - failed.length}/${results.length} checks passed against ${base}\n`)
  process.exit(failed.length > 0 ? 1 : 0)
}

main().catch(err => {
  process.stderr.write(`check-worker failed: ${err?.stack ?? err}\n`)
  process.exit(1)
})
