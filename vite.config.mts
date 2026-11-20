import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import vinext from 'vinext'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Cloudflare Workers build (vinext, App Router). The Next/Vercel build keeps
 * using next.config.ts; both run from the same sources until the cutover.
 * `.mts` keeps package.json CommonJS. See deploy/cloudflare.md.
 */

/** Public env that must be inlined into the client bundle for a CI build. */
const REQUIRED_PUBLIC_ENV = ['NEXT_PUBLIC_HUB_BACKEND_URL'] as const

/**
 * A few @polkadot packages (x-textdecoder, x-textencoder, x-randomvalues, x-fetch,
 * x-ws, wasm-crypto-init) export only `browser`, `node` and `react-native`
 * conditions, with no `default`. workerd's server environments match none of
 * them, so the RSC/SSR builds fail to resolve them. Point server environments at
 * the `browser` entry, which only needs Web APIs workerd has (TextDecoder,
 * crypto.getRandomValues, fetch, WebSocket, WebAssembly). The client is untouched.
 */
function serverPolkadotEntries(): Plugin {
  return {
    name: 'migration:server-polkadot-entries',
    enforce: 'pre',
    applyToEnvironment: env => env.name !== 'client',
    async resolveId(source, importer, options) {
      if (!/^@polkadot\/[^/]+$/.test(source)) return null
      const manifest = await this.resolve(`${source}/package.json`, importer, { ...options, skipSelf: true })
      if (!manifest) return null
      const root = JSON.parse(readFileSync(manifest.id, 'utf8')).exports?.['.']
      if (!root || typeof root !== 'object' || ['default', 'module', 'import', 'require'].some(key => key in root)) return null
      const target = root.browser?.module?.default
      return typeof target === 'string' ? join(dirname(manifest.id), target) : null
    },
  }
}

export default defineConfig(({ command, mode }) => {
  // NEXT_PUBLIC_* are inlined at build time; a missing one renders on the server
  // but breaks in the browser, so CI builds fail fast instead. `command` check:
  // `vite preview` reloads this config and must not need build env.
  if (command === 'build' && process.env.CI) {
    const env = { ...loadEnv(mode, process.cwd(), 'NEXT_PUBLIC_'), ...process.env }
    const missing = REQUIRED_PUBLIC_ENV.filter(key => !env[key])
    if (missing.length > 0) {
      throw new Error(`Cloudflare build is missing public env: ${missing.join(', ')}`)
    }
  }

  return {
    // App Router: the RSC environment (with SSR as its child) runs in workerd.
    plugins: [serverPolkadotEntries(), vinext(), cloudflare({ viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } })],
    resolve: { tsconfigPaths: true },
    environments: {
      // Next's bundler provided a `Buffer` global in the browser; Vite does not.
      // lib/ledger, lib/account and the Ledger/Polkadot libraries use it, some
      // while their modules load, so inject it per module. The Worker gets
      // Buffer from nodejs_compat.
      client: { build: { rolldownOptions: { transform: { inject: { Buffer: ['buffer', 'Buffer'] } } } } },
      // @vitejs/plugin-rsc loads the SSR entry as `ssr/index.js`, but Vite names
      // ESM entries `.mjs` in a CommonJS package (no "type": "module" here, so
      // Next keeps loading postcss.config.js).
      ssr: { build: { rolldownOptions: { output: { entryFileNames: '[name].js' } } } },
    },
  }
})
