'use client'

import { motion } from 'framer-motion'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export function Header() {
  return (
    <header className="flex justify-between items-center mb-8">
      <motion.div
        className="flex items-center space-x-2"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-10 h-10 rounded-full bg-linear-to-r from-[#FF2670] to-[#7916F3] flex items-center justify-center shadow-lg">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-linear-to-r from-[#FF2670] to-[#7916F3]" />
          </div>
        </div>
        <div className="flex flex-row gap-2">
          <span className="font-bold text-lg text-white">Polkadot Ledger Migration Assistant</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-xs px-2 py-0.5 bg-[#FF2670] text-white rounded-full">BETA</span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  This project is still in development. For now, we recommend to use it for testing purposes only. The transactions will
                  consist of small amounts.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        {/* <User /> */}
      </motion.div>
    </header>
  )
}
