import { useCallback, useState } from 'react'

import type { TabItem } from '../Tabs'

interface UseTabsProps<T extends string> {
  tabs: TabItem<T>[]
}

interface UseTabsReturn<_T extends string> {
  activeTab: number
  handleTabChange: (tabIndex: number) => void
  goToNextTab: () => void
  goToPreviousTab: () => void
}

export const useTabs = <T extends string>({ tabs }: UseTabsProps<T>): UseTabsReturn<T> => {
  const [activeTab, setActiveTab] = useState<number>(0)

  // Tab change handler with additional logic
  const handleTabChange = useCallback((tabIndex: number) => {
    // Find the index of the tab in tabs array
    if (tabIndex !== -1) {
      setActiveTab(tabIndex)
    }
  }, [])

  // Helper to go to the next tab in sequence
  const goToNextTab = useCallback(() => {
    if (activeTab < tabs.length - 1) {
      setActiveTab(activeTab + 1)
    }
  }, [activeTab, tabs.length])

  // Helper to go to the previous tab in sequence
  const goToPreviousTab = useCallback(() => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1)
    }
  }, [activeTab])

  return {
    activeTab,
    handleTabChange,
    goToNextTab,
    goToPreviousTab,
  }
}
