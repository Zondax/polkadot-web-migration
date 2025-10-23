'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { warningDetails } from '@/config/warnings'
import { AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LedgerUnlockReminderProps {
  isVisible: boolean
}

// Time before showing first reminder (1 minute in milliseconds)
const LEDGER_MINIMUM_UNLOCK_REMINDER_INTERVAL = 60000

const LEDGER_UNLOCK_REMINDER_INTERVAL = LEDGER_MINIMUM_UNLOCK_REMINDER_INTERVAL - 10000 // Show 10 seconds before 1 minute

export function LedgerUnlockReminder({ isVisible }: LedgerUnlockReminderProps) {
  const [showReminder, setShowReminder] = useState(false)
  const [hasShownOnce, setHasShownOnce] = useState(false)

  useEffect(() => {
    if (!isVisible) {
      setShowReminder(false)
      setHasShownOnce(false)
      return
    }

    // Show initial reminder at 50 seconds (10 seconds before 1 minute)
    const initialTimer = setTimeout(() => {
      setShowReminder(true)
      setHasShownOnce(true)
      // Keep it persistent after first appearance
    }, LEDGER_UNLOCK_REMINDER_INTERVAL)

    return () => {
      clearTimeout(initialTimer)
    }
  }, [isVisible])

  // Once shown, keep it visible while isVisible is true
  useEffect(() => {
    if (isVisible && hasShownOnce) {
      setShowReminder(true)
    }
  }, [isVisible, hasShownOnce])

  if (!showReminder) return null

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-900">
        <strong>{warningDetails.ledger_unlock_reminder.title}</strong> - {warningDetails.ledger_unlock_reminder.description}
      </AlertDescription>
    </Alert>
  )
}
