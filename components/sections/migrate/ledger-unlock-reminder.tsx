'use client'

import { AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface LedgerUnlockReminderProps {
  isVisible: boolean
}

// Time before showing first reminder (1 minute in milliseconds)
const LEDGER_MINIMUM_UNLOCK_REMINDER_INTERVAL = 60000

const LEDGER_UNLOCK_REMINDER_INTERVAL = LEDGER_MINIMUM_UNLOCK_REMINDER_INTERVAL - 10000 // Show 10 seconds before 1 minute

// Time the reminder is shown on screen (10 seconds in milliseconds)
const LEDGER_UNLOCK_REMINDER_TIME_ON_SCREEN = 10000

export function LedgerUnlockReminder({ isVisible }: LedgerUnlockReminderProps) {
  const [showReminder, setShowReminder] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setShowReminder(false)
      return
    }

    // Show initial reminder at 50 seconds (10 seconds before 1 minute)
    const initialTimer = setTimeout(() => {
      setShowReminder(true)
      // Hide after 10 seconds
      setTimeout(() => setShowReminder(false), LEDGER_UNLOCK_REMINDER_TIME_ON_SCREEN)
    }, LEDGER_UNLOCK_REMINDER_INTERVAL)

    // Show reminder every minute after the initial one
    const intervalTimer = setInterval(() => {
      setShowReminder(true)
      // Hide after 10 seconds
      setTimeout(() => setShowReminder(false), LEDGER_UNLOCK_REMINDER_TIME_ON_SCREEN)
    }, LEDGER_MINIMUM_UNLOCK_REMINDER_INTERVAL)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(intervalTimer)
    }
  }, [isVisible])

  if (!showReminder) return null

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-900">
        <strong>Keep your Ledger device unlocked</strong> - The synchronization process is still running. Please ensure your device stays
        active to complete the process successfully.
      </AlertDescription>
    </Alert>
  )
}
