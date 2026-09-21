import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Content-Security-Policy for the app.
 *
 * Notes:
 * - `script-src` keeps `'unsafe-inline'` because the App Router injects inline
 *   bootstrap/hydration scripts. `'wasm-unsafe-eval'` is required by the
 *   Polkadot crypto stack (@polkadot/wasm-crypto instantiates WebAssembly);
 *   without it, address derivation and signing break. Full `'unsafe-eval'` is
 *   granted only in development (React dev tooling and the dev server rely on
 *   eval); production stays strict. Tightening to a nonce-based policy would
 *   require a middleware injecting a per-request nonce (tracked as a follow-up).
 * - `connect-src` allows `wss:` for the many (rotating) Polkadot RPC endpoints
 *   in config/appsConfig.json plus the Zondax hub backend over https. Subscan
 *   is only ever contacted server-side via /api routes, so it is not listed.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://avatars.githubusercontent.com https://*.public.blob.vercel-storage.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.zondax.ch wss:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Keep WebHID/WebUSB/serial enabled for the Ledger transport; disable the rest.
  {
    key: 'Permissions-Policy',
    value: 'hid=(self), usb=(self), serial=(self), camera=(), microphone=(), geolocation=(), payment=()',
  },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
