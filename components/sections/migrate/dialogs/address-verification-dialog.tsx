'use client'

import { use$ } from '@legendapp/state/react'
import { useEffect } from 'react'
import { CustomTooltip } from '@/components/CustomTooltip'
import { ExplorerLink } from '@/components/ExplorerLink'
import { useMigration } from '@/components/hooks/useMigration'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type AppId, appsConfigs } from '@/config/apps'
import { ExplorerItemType } from '@/config/explorers'
import { verificationStatusMap } from '@/config/ui'
import { muifyHtml } from '@/lib/utils'
import type { VerificationStatus } from '@/state/types/ledger'
import { uiState$ } from '@/state/ui'

interface AddressVerificationDialogProps {
  open: boolean
  onClose: () => void
}

export const AddressVerificationDialog = ({ open, onClose }: AddressVerificationDialogProps) => {
  const icons = use$(uiState$.icons.get())

  // Use the hook directly instead of receiving via props
  const { destinationAddressesByApp, verifyDestinationAddresses, verifyFailedAddresses, isVerifying, allVerified, anyFailed } =
    useMigration()

  const startVerification = async () => {
    // If there are failed addresses, only verify those, otherwise verify all
    if (anyFailed) {
      verifyFailedAddresses()
    } else {
      verifyDestinationAddresses()
    }
  }

  useEffect(() => {
    if (allVerified && !isVerifying) {
      const timer = setTimeout(() => {
        onClose()
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [allVerified, isVerifying, onClose])

  const renderStatusIcon = (status: VerificationStatus) => {
    const { icon, tooltip } = verificationStatusMap[status] || { icon: undefined, tooltip: undefined }

    return <CustomTooltip tooltipBody={tooltip}>{icon}</CustomTooltip>
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Destination Addresses</DialogTitle>
          <DialogDescription>
            Please verify all destination addresses. You will need to confirm each address on your Ledger device.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <h4 className="font-medium mb-2">Destination Addresses</h4>
          <ul className="space-y-2 max-h-[250px] overflow-auto">
            {Object.entries(destinationAddressesByApp).map(([appId, addresses]) => {
              const appConfig = appsConfigs.get(appId as AppId)
              const appName = appConfig?.name || appId
              const icon = icons[appId as AppId]

              return (
                <li key={appId} className={'flex flex-col p-2 rounded border bg-white'}>
                  <div className="font-medium text-sm mb-2 flex items-center gap-2">
                    {icon && <div className="max-h-5 overflow-hidden [&_svg]:max-h-5 [&_svg]:w-5 flex items-center">{muifyHtml(icon)}</div>}
                    <span>{appName}</span>
                  </div>
                  <div className="flex flex-col">
                    {addresses.map(item => (
                      <div key={item.address} className="flex flex-row items-center justify-between">
                        <div className="text-xs text-gray-500">
                          <ExplorerLink
                            value={item.address}
                            appId={appId as AppId}
                            explorerLinkType={ExplorerItemType.Address}
                            disableTooltip
                          />
                        </div>
                        <div className="flex items-center">{renderStatusIcon(item.status)}</div>
                      </div>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button className="bg-[#7916F3] hover:bg-[#6B46C1] text-white" onClick={startVerification} disabled={isVerifying || allVerified}>
            {isVerifying ? 'Verifying...' : allVerified ? 'All Verified' : anyFailed ? 'Retry Failed' : 'Verify Addresses'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
