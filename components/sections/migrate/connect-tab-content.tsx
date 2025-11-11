'use client'

import { useConnection } from '@/components/hooks/useConnection'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Info } from 'lucide-react'
import Link from 'next/link'
import { useCallback } from 'react'

interface ConnectTabContentProps {
  onContinue: () => void
}

export function ConnectTabContent({ onContinue }: ConnectTabContentProps) {
  const { isLedgerConnected, isAppOpen, connectDevice } = useConnection()

  const handleConnect = useCallback(async () => {
    try {
      const connected = await connectDevice()
      if (connected) {
        onContinue()
      }
    } catch (error) {
      console.error('Failed to connect device:', error)
    }
  }, [connectDevice, onContinue])

  // Step data for the grid
  const steps = [
    {
      title: 'Connect your Ledger device',
      description: 'Ensure your Ledger device is properly connected to your computer via USB.',
      highlight: isLedgerConnected,
    },
    {
      title: 'Enter your PIN code',
      description: 'Unlock your Ledger device by entering your PIN code on the device itself.',
      highlight: isLedgerConnected,
    },
    {
      title: 'Open the Migration App',
      description: 'Navigate to and open the Polkadot Migration App on your Ledger device.',
      highlight: isAppOpen,
      warning: isLedgerConnected && !isAppOpen,
    },
    {
      title: 'Click Connect',
      description: 'Once the previous steps are completed, click the "Connect" button below to proceed.',
      highlight: false,
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full py-12 w-full">
      <h2 className="text-3xl font-bold mb-3 text-center">Connect Your Device</h2>
      <p className="text-gray-700 mb-8 text-center max-w-xl">
        Follow these steps to securely connect your hardware device and prepare
        <br />
        for account migration.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 w-full max-w-3xl">
        {steps.map((step, idx) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 * (idx + 1) }}
            className={`bg-white p-6 rounded-xl shadow-md border border-purple-100 text-left flex flex-col h-full transition-colors ${
              step.highlight ? 'border-polkadot-green bg-polkadot-green/10' : step.warning ? 'border-rose-400 bg-rose-50' : ''
            }`}
          >
            <div className={'flex items-center mb-3'} data-testid={`connect-step-${idx + 1}`}>
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-lg mr-3 ${
                  step.highlight
                    ? 'bg-polkadot-green/20 text-polkadot-green'
                    : step.warning
                      ? 'bg-rose-100 text-rose-400'
                      : 'bg-purple-100 text-purple-600'
                }`}
                data-testid={`connect-step-${idx + 1}-icon`}
              >
                {idx + 1}
              </span>
              <span className="text-lg font-semibold text-gray-800">{step.title}</span>
            </div>
            <p className="text-gray-600 text-sm">{step.description}</p>
          </motion.div>
        ))}
      </div>
      <div className="w-full max-w-3xl mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <Alert variant="info">
            <Info className="h-4 w-4" />
            <AlertTitle>Polkadot Migration App Not Installed?</AlertTitle>
            <AlertDescription className="mt-1">
              If you don't have the Polkadot Migration App on your Ledger device, you can install it via{' '}
              <Link
                href="https://www.ledger.com/ledger-live"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 text-blue-700 hover:text-blue-800 underline font-medium"
              >
                Learn more
              </Link>
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>
      <Button
        className="mt-2 px-8 py-3 rounded-md text-lg font-semibold bg-[#7916F3] hover:bg-[#6B46C1] text-white shadow-lg"
        onClick={handleConnect}
        size="lg"
        data-testid="connect-ledger-button"
      >
        <span className="flex items-center gap-2">Connect</span>
      </Button>
    </div>
  )
}
