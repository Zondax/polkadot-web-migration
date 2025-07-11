'use client'

import { observer } from '@legendapp/state/react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { notifications$ } from 'state/notifications'
import { uiState$ } from 'state/ui'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { muifyHtml } from '@/lib/utils/html'

// Custom toast notification component
const NotificationToast = ({
  title,
  description,
  time,
  appIcon,
  onDismiss,
}: {
  title: string
  description: string
  time: string
  appIcon?: React.ReactNode
  onDismiss: () => void
}) => {
  return (
    <div className="w-full">
      <div className="flex justify-between items-start">
        <div className="text-base font-semibold">{title}</div>
        {appIcon && <div className="ml-2 overflow-hidden [&_svg]:max-h-8 [&_svg]:w-8">{appIcon}</div>}
      </div>
      <div className="text-sm text-muted-foreground">{time}</div>
      <div className="border-t border-gray-300 my-2" />
      <div className="flex justify-between items-start">
        <div className="text-sm text-muted-foreground mb-2">{description}</div>
      </div>
      <div className="flex justify-end">
        <Button aria-haspopup="true" variant="outline" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}

function Notifications() {
  const activeNotifications = notifications$.active?.get() ?? []

  // Get only the most recent notification
  const lastNotification = activeNotifications[activeNotifications.length - 1]

  // Effect to show toast when a new notification appears
  useEffect(() => {
    if (lastNotification) {
      const { title, description, appId } = lastNotification
      const appIcon = appId ? uiState$.icons.get()[appId] : null
      const currentTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })

      const toastId = toast(title, {
        duration: 5000,
        dismissible: true,
        style: {
          display: 'flex',
          flexDirection: 'column',
        },
        classNames: {
          content: 'w-full',
          toast: 'bg-white/90 backdrop-blur-md border border-white/20 shadow-lg rounded-md p-4 w-sm min-w-sm max-w-sm',
        },
      })
      toast.custom(
        (toastId: number | string) => (
          <NotificationToast
            title={title}
            description={description}
            time={currentTime}
            appIcon={appIcon ? muifyHtml(appIcon) : undefined}
            onDismiss={() => toast.dismiss(toastId)}
          />
        ),
        {
          id: toastId,
        }
      )
    }
  }, [lastNotification])

  return <Toaster position="bottom-right" theme="light" />
}

export default observer(Notifications)
