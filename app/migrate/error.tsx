'use client'

import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <main id="main-content" className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-lg md:text-2xl">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        We couldn&apos;t load the migration flow. This is usually temporary — please try again. If the problem persists, reconnect your
        device and refresh the page.
      </p>
      <Button variant="purple" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  )
}
