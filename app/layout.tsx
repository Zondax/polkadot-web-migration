import './globals.css'

import { Analytics } from '@vercel/analytics/react'
import { MotionProvider } from '@/components/MotionProvider'

export const metadata = {
  title: 'Polkadot Migration',
  description: 'Polkadot Migration',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen w-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-foreground focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <MotionProvider>{children}</MotionProvider>
      </body>
      <Analytics />
    </html>
  )
}
