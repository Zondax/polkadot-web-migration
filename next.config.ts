export default {
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
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-eval needed for Polkadot.js, unsafe-inline for Next.js
              "style-src 'self' 'unsafe-inline'", // unsafe-inline needed for styled-components
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' wss: https:",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: [
              'camera=(),',
              'microphone=(),',
              'geolocation=(),',
              'payment=(),',
              'usb=(self)',  // Allow USB for Ledger
              'hid=(self)'   // Allow HID for Ledger
            ].join(' ')
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none' // Required for Ledger WebUSB
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin'
          }
        ]
      }
    ]
  }
}
