import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import type { TabItem } from '../../Tabs'
import { useTabs } from '../useTabs'

// Mock component for testing
const MockComponent = () => null

describe('useTabs hook', () => {
  const mockTabs: TabItem<string>[] = [
    { label: 'Tab 1', value: 'tab1', component: MockComponent },
    { label: 'Tab 2', value: 'tab2', component: MockComponent },
    { label: 'Tab 3', value: 'tab3', component: MockComponent },
  ]

  beforeEach(() => {
    // No mocks needed for this pure hook
  })

  describe('initial state', () => {
    it('should initialize with activeTab as 0', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      expect(result.current.activeTab).toBe(0)
    })

    it('should return all expected functions', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      expect(typeof result.current.handleTabChange).toBe('function')
      expect(typeof result.current.goToNextTab).toBe('function')
      expect(typeof result.current.goToPreviousTab).toBe('function')
    })
  })

  describe('handleTabChange', () => {
    it('should change to the specified tab index', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      act(() => {
        result.current.handleTabChange(1)
      })

      expect(result.current.activeTab).toBe(1)
    })

    it('should change to tab at index 2', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      act(() => {
        result.current.handleTabChange(2)
      })

      expect(result.current.activeTab).toBe(2)
    })

    it('should handle index 0 correctly', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      // Start at tab 1
      act(() => {
        result.current.handleTabChange(1)
      })

      // Go back to tab 0
      act(() => {
        result.current.handleTabChange(0)
      })

      expect(result.current.activeTab).toBe(0)
    })

    it('should ignore invalid tab index (-1)', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      const initialTab = result.current.activeTab

      act(() => {
        result.current.handleTabChange(-1)
      })

      expect(result.current.activeTab).toBe(initialTab)
    })

    it('should handle out-of-bounds indices', () => {
      // TODO: review expectations - verify behavior with out-of-bounds indices
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      const _initialTab = result.current.activeTab

      act(() => {
        result.current.handleTabChange(999)
      })

      // Current implementation allows setting any positive index
      expect(result.current.activeTab).toBe(999)
    })
  })

  describe('goToNextTab', () => {
    it('should move to the next tab', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      act(() => {
        result.current.goToNextTab()
      })

      expect(result.current.activeTab).toBe(1)
    })

    it('should not exceed the last tab index', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      // Move to last tab
      act(() => {
        result.current.handleTabChange(2)
      })

      // Try to go beyond last tab
      act(() => {
        result.current.goToNextTab()
      })

      expect(result.current.activeTab).toBe(2)
    })

    it('should move through all tabs sequentially', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      // Should start at 0
      expect(result.current.activeTab).toBe(0)

      // Move to tab 1
      act(() => {
        result.current.goToNextTab()
      })
      expect(result.current.activeTab).toBe(1)

      // Move to tab 2
      act(() => {
        result.current.goToNextTab()
      })
      expect(result.current.activeTab).toBe(2)

      // Should not move beyond tab 2
      act(() => {
        result.current.goToNextTab()
      })
      expect(result.current.activeTab).toBe(2)
    })
  })

  describe('goToPreviousTab', () => {
    it('should move to the previous tab', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      // Start at tab 1
      act(() => {
        result.current.handleTabChange(1)
      })

      act(() => {
        result.current.goToPreviousTab()
      })

      expect(result.current.activeTab).toBe(0)
    })

    it('should not go below index 0', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      // Already at tab 0
      act(() => {
        result.current.goToPreviousTab()
      })

      expect(result.current.activeTab).toBe(0)
    })

    it('should move through all tabs backwards', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      // Start at last tab
      act(() => {
        result.current.handleTabChange(2)
      })
      expect(result.current.activeTab).toBe(2)

      // Move to tab 1
      act(() => {
        result.current.goToPreviousTab()
      })
      expect(result.current.activeTab).toBe(1)

      // Move to tab 0
      act(() => {
        result.current.goToPreviousTab()
      })
      expect(result.current.activeTab).toBe(0)

      // Should not move below tab 0
      act(() => {
        result.current.goToPreviousTab()
      })
      expect(result.current.activeTab).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle single tab', () => {
      const singleTab: TabItem<string>[] = [{ label: 'Only Tab', value: 'only', component: MockComponent }]

      const { result } = renderHook(() => useTabs({ tabs: singleTab }))

      expect(result.current.activeTab).toBe(0)

      // Try to go next
      act(() => {
        result.current.goToNextTab()
      })
      expect(result.current.activeTab).toBe(0)

      // Try to go previous
      act(() => {
        result.current.goToPreviousTab()
      })
      expect(result.current.activeTab).toBe(0)
    })

    it('should handle empty tabs array', () => {
      const emptyTabs: TabItem<string>[] = []

      const { result } = renderHook(() => useTabs({ tabs: emptyTabs }))

      expect(result.current.activeTab).toBe(0)

      // Try to go next with empty tabs
      act(() => {
        result.current.goToNextTab()
      })
      expect(result.current.activeTab).toBe(0)

      // Try to go previous with empty tabs
      act(() => {
        result.current.goToPreviousTab()
      })
      expect(result.current.activeTab).toBe(0)
    })

    it('should handle tabs with different value types', () => {
      const typedTabs: TabItem<'first' | 'second'>[] = [
        { label: 'First Tab', value: 'first', component: MockComponent },
        { label: 'Second Tab', value: 'second', component: MockComponent },
      ]

      const { result } = renderHook(() => useTabs({ tabs: typedTabs }))

      expect(result.current.activeTab).toBe(0)

      act(() => {
        result.current.handleTabChange(1)
      })

      expect(result.current.activeTab).toBe(1)
    })

    it('should maintain function identity for callbacks', () => {
      const { result, rerender } = renderHook(() => useTabs({ tabs: mockTabs }))

      const firstHandleTabChange = result.current.handleTabChange
      const firstGoToPreviousTab = result.current.goToPreviousTab

      // Rerender with same tabs
      rerender()

      // handleTabChange should maintain identity (no dependencies)
      expect(result.current.handleTabChange).toBe(firstHandleTabChange)

      // goToPreviousTab depends on activeTab, so identity might change
      expect(result.current.goToPreviousTab).toBe(firstGoToPreviousTab)
    })

    it('should update function identity when activeTab changes', () => {
      const { result } = renderHook(() => useTabs({ tabs: mockTabs }))

      const initialGoToNextTab = result.current.goToNextTab
      const initialGoToPreviousTab = result.current.goToPreviousTab

      // Change active tab
      act(() => {
        result.current.handleTabChange(1)
      })

      // Functions should have new identity due to activeTab dependency
      expect(result.current.goToNextTab).not.toBe(initialGoToNextTab)
      expect(result.current.goToPreviousTab).not.toBe(initialGoToPreviousTab)
    })

    it('should handle tabs array length changes', () => {
      let tabs = mockTabs.slice(0, 2) // Start with 2 tabs

      const { result, rerender } = renderHook(() => useTabs({ tabs }))

      // Move to last tab
      act(() => {
        result.current.handleTabChange(1)
      })
      expect(result.current.activeTab).toBe(1)

      // Add another tab
      tabs = [...mockTabs]
      rerender()

      // Should now be able to go to next tab
      act(() => {
        result.current.goToNextTab()
      })
      expect(result.current.activeTab).toBe(2)
    })
  })
})
