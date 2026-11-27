// Guards the private dev Worker behind the shared Zondax-only Access application
// (the same application beryx, web-hub and kunobi-web's private Workers use).
//
//   node tools/check-worker-access.mjs tools/access.json          # Access protects the Worker
//   node tools/check-worker-access.mjs tools/access.json <url>    # ...and <url> redirects to the login
//
// Requires CLOUDFLARE_API_TOKEN with Account → Workers Scripts Read (to resolve the
// Worker id) and Access: Apps and Policies Read. The Worker destination covers the
// workers.dev URL and every preview URL, so no service token is needed: CI asserts
// that unauthenticated requests are sent to the Access login instead.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const PROBE_ATTEMPTS = 12
const PROBE_DELAY_MS = 10_000

/** The application must protect this whole Worker and admit only Zondax GitHub members. */
export function assertWorkerAccess(app, expected, workerId) {
  assert.equal(app.type, 'self_hosted')
  const destination = (app.destinations ?? []).find(item => item.type === 'worker' && item.worker_id === workerId)
  assert.ok(destination, `Access application ${expected.applicationId} does not protect Worker ${expected.workerName} (${workerId})`)
  assert.ok(!destination.overrides?.length, 'The Worker destination must not carry public path overrides')
  assert.deepEqual(app.allowed_idps, [expected.identityProviderId], 'Only the Zondax GitHub login may be allowed')
  assert.equal(app.policies?.length, 1, 'A private Worker must have exactly one allow policy')
  const [policy] = app.policies
  assert.equal(policy.decision, 'allow')
  assert.equal(policy.include?.length, 1, 'Only Zondax GitHub membership may grant access')
  const organization = policy.include[0]['github-organization']
  assert.ok(organization, 'The allow policy must be a GitHub organization rule')
  assert.equal(organization.name, expected.organization)
  assert.equal(organization.identity_provider_id, expected.identityProviderId)
}

/** A fresh deploy can briefly 404/5xx; those are retried. A 200 means the page is public and fails at once. */
export async function probeRedirectsToAccess(
  url,
  authDomain,
  { attempts = PROBE_ATTEMPTS, delayMs = PROBE_DELAY_MS, fetchImpl = globalThis.fetch } = {}
) {
  let last
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const page = await fetchImpl(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
      })
      if (page.status === 302) {
        assert.equal(new URL(page.headers.get('location')).hostname, authDomain, `${url} redirects outside Access`)
        return
      }
      assert.ok(page.status === 404 || page.status >= 500, `${url} must require authentication (got ${page.status})`)
      last = `HTTP ${page.status}`
    } catch (error) {
      if (error instanceof assert.AssertionError) throw error
      last = error.message
    }
    if (attempt < attempts) await sleep(delayMs)
  }
  assert.fail(`${url} never reached Access after ${attempts} attempts (last: ${last})`)
}

async function api(expected, token, path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${expected.accountId}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  })
  const data = await response.json().catch(() => ({}))
  assert.ok(
    response.status === 200 && data.success,
    `Cloudflare API ${path} returned ${response.status}${response.status === 403 ? ' (the token needs Access: Apps and Policies Read)' : ''}`
  )
  return data.result
}

async function main([configPath, url]) {
  assert.ok(configPath, 'Usage: check-worker-access.mjs <access.json> [url]')
  const expected = JSON.parse(await readFile(configPath, 'utf8'))
  const token = process.env.CLOUDFLARE_API_TOKEN
  assert.ok(token, 'CLOUDFLARE_API_TOKEN is required to verify Access protection')
  const worker = (await api(expected, token, 'workers/scripts')).find(item => item.id === expected.workerName)
  assert.ok(worker?.tag, `Worker ${expected.workerName} not found`)
  assertWorkerAccess(await api(expected, token, `access/apps/${expected.applicationId}`), expected, worker.tag)
  process.stdout.write(`Access: Zondax GitHub members only; Worker ${expected.workerName} and all its previews protected\n`)
  if (!url) return
  for (const path of expected.probePaths) await probeRedirectsToAccess(new URL(path, url), expected.authDomain)
  process.stdout.write(`${expected.probePaths.join(', ')} on ${url} require Access authentication\n`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2))
}
