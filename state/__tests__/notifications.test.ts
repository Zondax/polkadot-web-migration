import { beforeEach, describe, expect, it } from 'vitest'

import { notifications$ } from '../notifications'

describe('Notifications State', () => {
  beforeEach(() => {
    // Reset state before each test
    notifications$.active.set([])
    notifications$.history.set([])
  })

  describe('Initial state', () => {
    it('should have empty notifications array initially', () => {
      expect(notifications$.active.get()).toEqual([])
      expect(notifications$.history.get()).toEqual([])
    })
  })

  describe('push', () => {
    it('should add a notification with provided data', () => {
      const notification = {
        title: 'Success',
        description: 'Operation successful',
        type: 'success' as const,
      }

      notifications$.push(notification)

      const activeNotifications = notifications$.active.get()
      expect(activeNotifications.length).toBe(1)
      expect(activeNotifications[0].title).toBe('Success')
      expect(activeNotifications[0].description).toBe('Operation successful')
      expect(activeNotifications[0].type).toBe('success')
    })

    it('should generate an ID if not provided', () => {
      const notification = {
        title: 'Info',
        description: 'Information message',
        type: 'info' as const,
      }

      notifications$.push(notification)

      const activeNotifications = notifications$.active.get()
      expect(activeNotifications.length).toBe(1)
      expect(activeNotifications[0].id).toBeDefined()
      expect(activeNotifications[0].type).toBe('info')
      expect(activeNotifications[0].title).toBe('Info')
    })

    it('should add multiple notifications', () => {
      notifications$.push({
        title: 'Success',
        description: 'Success message',
        type: 'success' as const,
      })
      notifications$.push({
        title: 'Error',
        description: 'Error message',
        type: 'error' as const,
      })
      notifications$.push({
        title: 'Info',
        description: 'Info message',
        type: 'info' as const,
      })

      const activeNotifications = notifications$.active.get()
      expect(activeNotifications.length).toBe(3)
      expect(activeNotifications.map(n => n.title)).toEqual(['Success', 'Error', 'Info'])
    })
  })

  describe('dismiss', () => {
    it('should remove a notification by ID', () => {
      // Add notifications
      notifications$.push({
        title: 'Success',
        description: 'Success message',
        type: 'success' as const,
      })
      notifications$.push({
        title: 'Error',
        description: 'Error message',
        type: 'error' as const,
      })

      // Get the ID of the first notification
      const firstId = notifications$.active.get()[0].id

      // Remove one
      notifications$.dismiss(firstId)

      // Check result
      const activeNotifications = notifications$.active.get()
      expect(activeNotifications.length).toBe(1)
      expect(activeNotifications[0].title).toBe('Error')
    })

    it('should do nothing if ID does not exist', () => {
      // Add a notification
      notifications$.push({
        title: 'Success',
        description: 'Success message',
        type: 'success' as const,
      })

      // Try to remove non-existent notification
      notifications$.dismiss('non-existent-id')

      // Check that the state is unchanged
      const activeNotifications = notifications$.active.get()
      expect(activeNotifications.length).toBe(1)
      expect(activeNotifications[0].title).toBe('Success')
    })
  })

  describe('dismissAll', () => {
    it('should remove all notifications', () => {
      // Add multiple notifications
      notifications$.push({
        title: 'Success',
        description: 'Success message',
        type: 'success' as const,
      })
      notifications$.push({
        title: 'Error',
        description: 'Error message',
        type: 'error' as const,
      })
      notifications$.push({
        title: 'Info',
        description: 'Info message',
        type: 'info' as const,
      })

      // Clear all
      notifications$.dismissAll()

      // Check result
      expect(notifications$.active.get()).toEqual([])
      // History should still contain the notifications but with dismissedAt set
      expect(notifications$.history.get().length).toBe(3)
    })
  })
})
