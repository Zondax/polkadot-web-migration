import type { AppId } from 'config/apps'

/**
 * Notification Type Definition
 */
export interface Notification {
  id: string
  title: string
  description: string
  type: 'info' | 'success' | 'warning' | 'error'
  /** The ID of the app that the notification is related to */
  appId?: AppId
  createdAt: Date
  dismissedAt?: Date
  action?: {
    label: string
    onClick: () => void
  }
  autoHideDuration?: number
}
