// @vitest-environment node
import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import { test } from 'vitest'
import { assertWorkerAccess, probeRedirectsToAccess } from './check-worker-access.mjs'

const expected = {
  applicationId: 'app',
  workerName: 'web-migration-dev',
  identityProviderId: 'idp',
  organization: 'Zondax',
}
const app = (overrides = {}) => ({
  type: 'self_hosted',
  destinations: [
    { type: 'worker', worker_id: 'other' },
    { type: 'worker', worker_id: 'w1' },
  ],
  allowed_idps: ['idp'],
  policies: [{ decision: 'allow', include: [{ 'github-organization': { name: 'Zondax', identity_provider_id: 'idp' } }] }],
  ...overrides,
})

test('accepts the shared app protecting the Worker', () => {
  assertWorkerAccess(app(), expected, 'w1')
})

test('rejects an app that does not protect the Worker', () => {
  assert.throws(() => assertWorkerAccess(app(), expected, 'w2'), /does not protect Worker/)
})

test('rejects path overrides on the Worker destination', () => {
  const destinations = [{ type: 'worker', worker_id: 'w1', overrides: [{ path: '/api/*' }] }]
  assert.throws(() => assertWorkerAccess(app({ destinations }), expected, 'w1'), /overrides/)
})

test('rejects extra policies or a wider include', () => {
  const allow = app().policies[0]
  assert.throws(() => assertWorkerAccess(app({ policies: [allow, { decision: 'bypass' }] }), expected, 'w1'), /exactly one/)
  assert.throws(
    () => assertWorkerAccess(app({ policies: [{ ...allow, include: [...allow.include, { everyone: {} }] }] }), expected, 'w1'),
    /Only Zondax GitHub/
  )
  assert.throws(() => assertWorkerAccess(app({ allowed_idps: ['idp', 'otp'] }), expected, 'w1'))
})

// vitest.setup-supplement.ts replaces global fetch with a mock, so the probe gets a minimal real HTTP client.
function httpFetch(url, { headers } = {}) {
  return new Promise((resolve, reject) => {
    const req = request(url, { headers }, res => {
      res.resume()
      resolve({ status: res.statusCode, headers: { get: name => res.headers[name.toLowerCase()] ?? null } })
    })
    req.on('error', reject)
    req.end()
  })
}

async function serve(handler, fn) {
  const server = createServer(handler)
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    await fn(`http://127.0.0.1:${server.address().port}/`)
  } finally {
    server.close()
  }
}

test('probe passes on a redirect to the Access login', async () => {
  await serve(
    (_, res) => res.writeHead(302, { location: 'https://zondax.cloudflareaccess.com/cdn-cgi/access/login' }).end(),
    url => probeRedirectsToAccess(url, 'zondax.cloudflareaccess.com', { attempts: 1, fetchImpl: httpFetch })
  )
})

test('probe fails at once on a public 200', async () => {
  await serve(
    (_, res) => res.writeHead(200).end('ok'),
    url =>
      assert.rejects(
        probeRedirectsToAccess(url, 'zondax.cloudflareaccess.com', { attempts: 3, delayMs: 0, fetchImpl: httpFetch }),
        /must require authentication/
      )
  )
})

test('probe retries 404 until Access answers', async () => {
  let calls = 0
  await serve(
    (_, res) => (++calls < 3 ? res.writeHead(404).end() : res.writeHead(302, { location: 'https://zondax.cloudflareaccess.com/' }).end()),
    url => probeRedirectsToAccess(url, 'zondax.cloudflareaccess.com', { attempts: 5, delayMs: 0, fetchImpl: httpFetch })
  )
  assert.equal(calls, 3)
})
