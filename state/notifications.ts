import { observable } from '@legendapp/state'

import type { Notification } from './types/notifications'

/**
 * Notification Management System
 *
 * This system manages notifications with features like:
 * - Adding new notifications
 * - Dismissing notifications
 * - Maintaining notification history
 * - Clearing notifications
 * - Auto-dismissal functionality
 */
export const notifications$ = observable({
  // Active notifications that haven't been dismissed
  active: [] as Notification[],

  // History of all notifications including dismissed ones
  history: [] as Notification[],

  // Actions
  push(notification: Omit<Notification, 'id' | 'createdAt'>) {
    if (!notification) return

    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }

    // Add to active notifications and history
    notifications$.active.push(newNotification)
    notifications$.history.push(newNotification)
  },

  dismiss(id: string | undefined) {
    if (!id) return

    const notificationIndex = notifications$.active.get()?.findIndex(n => n?.id === id) ?? -1
    if (notificationIndex !== -1) {
      // Update dismissedAt in history
      const historyIndex = notifications$.history.get()?.findIndex(n => n?.id === id) ?? -1
      if (historyIndex !== -1) {
        notifications$.history[historyIndex].dismissedAt?.set(new Date())
      }

      // Remove from active notifications
      notifications$.active.splice(notificationIndex, 1)
    }
  },

  dismissAll() {
    const currentTime = new Date()
    // Update dismissedAt for all active notifications in history
    notifications$.history.get()?.forEach((notification, index) => {
      if (notification && !notification.dismissedAt && notifications$.active.get()?.some(n => n?.id === notification.id)) {
        notifications$.history[index].dismissedAt?.set(currentTime)
      }
    })

    // Clear active notifications
    notifications$.active.set([])
  },

  clearHistory() {
    notifications$.history.set([])
  },

  // Computed getters
  getActiveCount() {
    return notifications$.active.get()?.length ?? 0
  },

  getHistoryByType(type: Notification['type'] | undefined) {
    if (!type) return []
    return notifications$.history.get()?.filter(n => n?.type === type) ?? []
  },

  getRecentHistory(limit = 10) {
    const history = notifications$.history.get()
    if (!history?.length) return []

    return history.sort((a, b) => (b?.createdAt?.getTime() ?? 0) - (a?.createdAt?.getTime() ?? 0)).slice(0, limit)
  },
})
