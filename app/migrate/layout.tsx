import type { Metadata } from 'next'
import type React from 'react'

export const metadata: Metadata = {
  title: 'Migrate - Polkadot Ledger Migration Assistant',
  description: 'Migrate your Polkadot accounts to the Universal Ledger App',
}

export default function MigrateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
