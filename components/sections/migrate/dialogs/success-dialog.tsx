'use client'

import { CheckCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface SuccessDialogProps {
  open: boolean
  onClose: () => void
  onReturn: () => void
  successCount: number
  totalCount: number
}

export function SuccessDialog({ open, onClose, onReturn, successCount, totalCount }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center">
          <DialogTitle>
            <CheckCircle className="h-6 w-6 text-green-500" />
            Migration Completed
          </DialogTitle>
          <DialogDescription>Your accounts have been migrated to the Universal Ledger App.</DialogDescription>
          <DialogDescription className="pt-3">
            {successCount} of {totalCount} transactions successful.
          </DialogDescription>
          <DialogDescription className="pt-3">View details to see the results of the transactions.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            View Details
          </Button>
          <Button className="bg-[#7916F3] hover:bg-[#6B46C1] text-white" onClick={onReturn}>
            Return to Home
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
