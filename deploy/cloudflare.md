# Running the migration app on Cloudflare Workers

The app builds as a Cloudflare Worker with [vinext](https://github.com/cloudflare/vinext) (Vite +
`@cloudflare/vite-plugin`, App Router), the same setup as `web-beryx-explorer-priv` and `web-hub`. Vercel keeps
building and serving with `next build` until the cutover. A Vercel build does not use anything described here.

| Branch | Worker              | Address                                                                                |
| ------ | ------------------- | -------------------------------------------------------------------------------------- |
| `dev`  | `web-migration-dev` | `https://web-migration-dev.zondax.workers.dev` (Zondax login)                          |
| `main` | `web-migration-pro` | `https://web-migration-pro.zondax.workers.dev`, then `polkadot.zondax.ch` at cutover   |

`wrangler.jsonc`: the top level is the dev Worker; `env.pro` is production, selected at build time with
`CLOUDFLARE_ENV=pro` (the vite plugin bakes the environment into `dist/*/wrangler.json`, so deploys take no `--env`).

## Locally

```bash
pnpm build:cloudflare   # vinext build → dist/
pnpm preview:cf         # serve dist/ in workerd on http://127.0.0.1:3300
pnpm test:worker        # parity smoke against it (any base URL as argument)
pnpm e2e:worker         # Playwright (chromium) against the Worker build
pnpm check:compat       # vinext compatibility report
pnpm cf:types           # regenerate worker-configuration.d.ts after changing wrangler.jsonc
```

`build:cloudflare` reads `NEXT_PUBLIC_*` from `.env`/the environment at build time (`pnpm env:init` creates `.env`).
Server secrets for a local run go in `.dev.vars` (not committed), e.g. `SUBSCAN_API_KEY=…`. `GET /api/health`
returns `{"app":"web-migration","status":"ok","env":…}` (`preview` on the dev Worker, `production` on `env.pro`,
`VERCEL_ENV` on Vercel).

A leftover `vite preview` on port 3300 makes every route fail; stop it before starting another (`--strictPort` makes
the clash visible).

## Settings

**Build time: `NEXT_PUBLIC_*`.** These are inlined into the client bundle, so they belong in the deploy workflow's
GitHub environment (`cloudflare-dev`, `cloudflare-production`), never as Worker variables. A CI build fails if
`NEXT_PUBLIC_HUB_BACKEND_URL` is missing (`vite.config.mts`).

| Variable                                                                                                                                                                              | Dev / production                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_HUB_BACKEND_URL`                                                                                                                                                         | `https://api.zondax.ch/hub` (what the live site inlines; also the CI fallback)        |
| `NEXT_PUBLIC_NODE_ENV`, `NEXT_PUBLIC_MAX_ADDRESSES_TO_FETCH`, `NEXT_PUBLIC_SYNC_APPS`, `NEXT_PUBLIC_MOCK_BALANCES`, `NEXT_PUBLIC_ERROR_SYNC_APPS`, `NEXT_PUBLIC_ERROR_SYNC_ADDRESSES`, `NEXT_PUBLIC_NATIVE_TRANSFER_AMOUNT` | development and testing toggles (`.env.backup`); leave unset unless Vercel sets them |

**Run time: server secret** `SUBSCAN_API_KEY`, read by `/api/subscan/referenda` and `/api/subscan/search`. Subscan
rejects unauthenticated calls, so those routes answer 400 without it. Set it as a secret in both GitHub environments
(or at repository level); CI pushes it with `wrangler deploy --secrets-file`. By hand:
`pnpm exec wrangler secret put SUBSCAN_API_KEY` (add `--env pro` for production).

**Deploy credentials**, in both GitHub environments: secret `CLOUDFLARE_API_TOKEN` and variable
`CLOUDFLARE_ACCOUNT_ID` (`556ea0147c469e38591bdc721cbbd13a`; a variable, not a secret, because the workflow reads
`vars.CLOUDFLARE_ACCOUNT_ID`). The token needs Account → Workers Scripts: Edit and Access: Apps and Policies: Read (for
the Access check below). For the production route it also needs Zone `zondax.ch` → Workers Routes: Edit.

## CI (`.github/workflows/ci-cloudflare.yml`)

| Event      | What runs                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR         | job `checks` (no secrets): vinext build, `vinext check`, parity smoke on the Worker **and** on Next, Playwright (chromium) on the Worker; job `dev`: preview version `pr-<n>` of `web-migration-dev`, same-repo PRs only |
| push `dev` | the same checks, then deploy `web-migration-dev` and verify Access                                                                                |
| push `main`| deploy `web-migration-pro` once the repository variable `CLOUDFLARE_PRODUCTION_ENABLED` is `true`; the health check asserts `env: production`      |
| manual run | deploy `web-migration-pro` from the chosen branch (cutover, hotfix)                                                                               |

**Fork PRs (this repository is public):** the `checks` job uses no secrets and no environment, and for fork PRs it
runs on `ubuntu-latest` instead of the self-hosted `zondax-runners`. The `dev` job (environment `cloudflare-dev`,
Cloudflare token, `SUBSCAN_API_KEY`) only runs for same-repo PRs and pushes; the head repository is checked explicitly,
not only through GitHub withholding secrets from forks. The workflow never uses `pull_request_target`.

- **Parity smoke** (`pnpm test:worker <url>`, `tools/check-worker.mjs`): every page under `app/`, unknown routes,
  the security headers from `next.config.ts` (pages and `public/` files), client assets, `/api/health`, and the input
  validation of `/api/subscan/*` (so the SSRF allowlist holds on both builds). The same checks run against
  `next start`, so a difference between the builds fails CI.
- **Playwright on the Worker** (`pnpm e2e:worker`, `MIGRATION_TARGET=worker`): the existing `e2e/` suite plus
  `e2e/worker-smoke.spec.ts`, which walks `/` → "Start Migration" → `/migrate` → "Connect" and fails on any console
  error. `PLAYWRIGHT_BASE_URL` targets an already running server instead.

## Private dev Worker (Cloudflare Access)

`web-migration-dev` and all its preview URLs sit behind the shared Zondax-only Access application that beryx, the hub
and kunobi-web's private Workers use (`tools/access.json`): only members of the Zondax GitHub organization, no service
tokens. After each deploy or preview upload, `tools/check-worker-access.mjs` checks the policy through the API and
that an unauthenticated request is redirected to `zondax.cloudflareaccess.com`.

One-time setup: in Zero Trust → Access → Applications, open the shared application
(`eebc6f4d-0515-4cd0-b4e0-4d67cf7ad484`) and add the Worker `web-migration-dev` as a destination (no path overrides).
The Worker must exist first, so the Access check of the first dev deploy fails until this is done; rerun the job
afterwards. `web-migration-pro` stays public.

## vinext specifics we rely on

- **App Router on workerd:** `cloudflare({ viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } })`, entry
  `vinext/server/app-router-entry`. vinext registers `@vitejs/plugin-rsc` itself (do not add it to the plugins). It
  needs React ≥ 19.3.1 and `react-server-dom-webpack` of the same version.
- **SSR entry name:** plugin-rsc loads `ssr/index.js`, but Vite names ESM entries `.mjs` in a CommonJS package, so
  `vite.config.mts` pins the SSR entry to `[name].js`. Without it every page is a 500 (`No such module "ssr/index.js"`).
  The alternative, `"type": "module"` in package.json, would also change how Next loads `postcss.config.js`.
- **`@polkadot/x-*` on the server:** `x-textdecoder`, `x-textencoder`, `x-randomvalues`, `x-fetch`, `x-ws` and
  `wasm-crypto-init` export only `browser`/`node`/`react-native` conditions. `vite.config.mts` points the server
  environments at their `browser` entry, which needs only Web APIs that workerd has. The browser build is unchanged.
- **`Buffer` in the browser:** Next's bundler provided it; Vite does not. The client build injects the `buffer`
  package per module (`environments.client.build.rolldownOptions.transform.inject`), because Ledger and Polkadot
  code uses it while modules load. `buffer` must stay a direct dependency, or Vite injects its empty browser stub. The
  Worker gets `Buffer` from `nodejs_compat`. No other Node built-in reaches the client bundle (`crypto`, `stream` and
  `process` are not imported by client code; Polkadot uses WebCrypto/wasm).
- **Security headers:** `next.config.ts` `headers()` (CSP, HSTS, Permissions-Policy for WebHID/WebUSB, …) are applied
  by vinext. `assets.run_worker_first` sends everything except `/_next/static/*` through the Worker, so `public/` files
  carry them too, as on Next.
- **HTML sanitizing:** `dompurify` runs in the browser only; `muifyHtml` renders nothing during SSR.
- **Vercel Web Analytics** renders only on Vercel (`components/VercelAnalytics.tsx`); the Worker has no analytics.
- **Images:** `next/image` is served unoptimized (only local SVGs are used).
- **`output: 'standalone'`** (for the Dockerfile) also makes vinext write `dist/standalone/`; the Worker ignores it.
- **`.next/types`:** vinext writes its own `.next/types/routes.d.ts`, so `tsc` right after `build:cloudflare` reports
  errors in Next's stale `validator.ts`. Run `pnpm build` (Next regenerates them) or delete `.next/types`.
- **Size:** about 1.3 MB gzip for the server bundle, within the Workers Free limit (3 MB).

## Switching on

1. Create the GitHub environments `cloudflare-dev` and `cloudflare-production` with `CLOUDFLARE_API_TOKEN` (secret),
   `CLOUDFLARE_ACCOUNT_ID` and `NEXT_PUBLIC_HUB_BACKEND_URL` (variables), and `SUBSCAN_API_KEY` (secret).
   Do not restrict `cloudflare-dev` by branch: same-repo PR runs (preview uploads) use `refs/pull/*`, and fork PRs never
   reach it. If you restrict `cloudflare-production`, allow `main` and `dev` (the pre-cutover manual run deploys from
   `dev`), or add required reviewers instead.
2. Push to `dev`: `web-migration-dev` is deployed. Add it to the shared Access application (above) and rerun the job.
3. Check the dev Worker end to end with a real Ledger: connect, synchronize, migrate on a test account.

## Cutover (`polkadot.zondax.ch`)

`polkadot.zondax.ch` is already a **proxied** record in the Cloudflare `zondax.ch` zone (public DNS returns Cloudflare
addresses; responses carry `server: cloudflare` and Vercel's `x-vercel-id`, checked on 2026-11-20). A zone route
therefore takes the traffic as soon as a `web-migration-pro` deploy carries it; no DNS step is needed. The route
lives in a separate draft PR.

1. Before the route is on `dev`, deploy `web-migration-pro` with a manual run (Actions → Cloudflare Worker → Run
   workflow, branch `dev`) and smoke-test `https://web-migration-pro.zondax.workers.dev` (production values, no
   traffic).
2. Merge the route PR into `dev`, set the repository variable `CLOUDFLARE_PRODUCTION_ENABLED` to `true`, and merge
   the `dev` → `main` release. The `main` push deploys `web-migration-pro` with the route, which is the cutover. CI
   checks that `/api/health` reports `env: production`.
3. Check that the Worker answers: `curl -sI https://polkadot.zondax.ch/api/health` must have no `x-vercel-id` header.
   Then the pages, a Subscan lookup and a Ledger flow.

**Rollback:** Cloudflare dashboard → zondax.ch → Workers Routes → delete `polkadot.zondax.ch/*`. Traffic returns to
Vercel immediately. Then set `CLOUDFLARE_PRODUCTION_ENABLED` to `false` (or revert the route) so the next `main` push
does not put it back. Keep the Vercel project until the switch has held.
