'use client'

import { migrationTabs } from 'config/ui'
import { motion, useAnimation } from 'framer-motion'
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
// Import section components
import { useLoadIcons } from '@/components/hooks/loadIcons'
import { useConnection } from '@/components/hooks/useConnection'
import { useTabs } from '@/components/hooks/useTabs'
import { GradientBackground } from '@/components/sections/migrate/background'
import { Header } from '@/components/sections/migrate/header'
import Notifications from '@/components/sections/migrate/notifications'
import { Tabs } from '@/components/Tabs'

type TabProps = { onContinue: () => void } | { onBack: () => void }

export default function MigratePage() {
  const controls = useAnimation()

  // Use our tab management hook
  const { activeTab, handleTabChange, goToNextTab, goToPreviousTab } = useTabs({
    tabs: migrationTabs,
  })
  const { isLedgerConnected, isAppOpen } = useConnection()

  useLoadIcons()

  // State to track tabs with completion status and disabled state
  const [tabsWithStatus, setTabsWithStatus] = useState(() =>
    migrationTabs.map((tab, index) => ({
      ...tab,
      isComplete: false,
      disabled: index > 0, // Initially only first tab is enabled
    }))
  )

  // Update tabs status when active tab changes
  useEffect(() => {
    setTabsWithStatus(prevTabs =>
      prevTabs.map((tab, index) => {
        return {
          ...tab,
          icon: index < activeTab ? <Check className="h-4 w-4 text-green-500" /> : undefined,
          disabled: index !== activeTab,
        }
      })
    )
  }, [activeTab])

  useEffect(() => {
    controls.start({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    })
  }, [controls])

  // Effect to handle device connection status and redirect to first tab if needed
  useEffect(() => {
    // If we're not on the first tab (Connect tab) and either the device is not connected
    // or the app is not open, go back to the first tab
    if (activeTab !== 0 && (!isLedgerConnected || !isAppOpen)) {
      // Reset to the first tab
      handleTabChange(0)
    }
  }, [isLedgerConnected, isAppOpen, activeTab, handleTabChange])
  // Prepare props for each tab component
  const connectProps: TabProps = {
    onContinue: () => goToNextTab(),
  }

  const synchronizeProps: TabProps = {
    onContinue: () => goToNextTab(),
  }

  const migrateProps: TabProps = {
    onBack: () => goToPreviousTab(),
  }

  // Get the active component with its props
  const getActiveComponent = () => {
    const TabComponent = tabsWithStatus[activeTab].component

    let props: TabProps
    switch (activeTab) {
      case 0:
        props = connectProps
        break
      case 1:
        props = synchronizeProps
        break
      case 2:
        props = migrateProps
        break
      default:
        // Fallback: use connectProps (or could throw an error)
        props = connectProps
        break
    }

    return <TabComponent {...props} />
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <GradientBackground showBlobs={true} animationSpeed={0.8} />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <Header />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={controls}
          className="bg-white/90 backdrop-blur-md rounded-xl border border-white/20 shadow-xl p-0 mb-8"
        >
          <div className="bg-linear-to-r from-[#F8F9FC]/90 to-white/90 rounded-xl border-b border-[#DCE2E9] px-4 py-3">
            {/* Tabs */}
            <Tabs tabs={tabsWithStatus} activeTab={activeTab} onTabChange={handleTabChange} />

            <div className="p-6 bg-white min-h-[500px]">
              {/* Render active tab component */}
              {getActiveComponent()}
            </div>
          </div>
        </motion.div>
      </div>

      <Notifications />
    </div>
  )
}
