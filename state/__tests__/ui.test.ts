import { beforeEach, describe, expect, it, vi } from 'vitest'

// Import the mocked module
import { getAppLightIcon } from '../../lib/utils'
import { uiState$ } from '../ui'

// Mock the getAppLightIcon function
vi.mock('../../lib/utils', () => {
  return {
    getAppLightIcon: vi.fn(),
  }
})

describe('UI State', () => {
  beforeEach(() => {
    // Reset the state before each test
    uiState$.icons.set({})

    // Reset the internal iconsStatus variable by re-importing the module
    vi.resetModules()

    // Clear mock call history
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty icons object initially', () => {
      expect(uiState$.icons.get()).toEqual({})
    })
  })

  describe('loadInitialIcons', () => {
    it('should load icons for apps', async () => {
      // Arrange
      ;(getAppLightIcon as any).mockResolvedValue({ data: 'test-icon-data' })

      // Act
      await uiState$.loadInitialIcons()

      // Assert
      expect(getAppLightIcon).toHaveBeenCalled()
      const icons = uiState$.icons.get()
      expect(Object.keys(icons).length).toBeGreaterThan(0)

      // Each icon should have the test data
      for (const iconData of Object.values(icons)) {
        expect(iconData).toBe('test-icon-data')
      }
    })

    it('should not add icons if there is an error', async () => {
      // Arrange
      ;(getAppLightIcon as any).mockResolvedValue({ error: 'Some error' })
      uiState$.icons.set({})

      // Force reset of internal state in uiState$ by reimporting it
      const uiStateModule = await import('../ui')
      const freshUIState = uiStateModule.uiState$

      // Act
      await freshUIState.loadInitialIcons()

      // Assert
      expect(getAppLightIcon).toHaveBeenCalled()
      expect(freshUIState.icons.get()).toEqual({})
    })
  })
})
