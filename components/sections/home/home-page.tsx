'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

import { FaGithub } from 'react-icons/fa'
import { GradientBackground } from '../migrate/background'
import { ActionButton } from './action-buttons'

interface HomePageProps {
  title?: string
  subtitle?: string
  animationSpeed?: number
}

export function HomePage({
  title = 'Welcome to the Polkadot Ledger Migration Assistant',
  subtitle = 'Simplifying your journey to the new Polkadot Universal Ledger App',
  animationSpeed = 1,
}: HomePageProps) {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden py-20 px-4">
      {/* Background with gradient and animations */}
      <GradientBackground showBlobs={false} showPaths={true} animationSpeed={animationSpeed} />

      <div className="relative z-20 container mx-auto  text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 / animationSpeed }}
          className="max-w-4xl mx-auto"
        >
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: 1 / animationSpeed,
              type: 'spring',
              stiffness: 150,
              damping: 25,
            }}
            className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tighter
                       text-transparent bg-clip-text bg-linear-to-r from-white to-white/80"
          >
            {title}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 1.5 / animationSpeed,
              duration: 1 / animationSpeed,
            }}
            className="text-xl md:text-2xl text-white/90 mb-6 max-w-3xl mx-auto"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 1.6 / animationSpeed,
              duration: 1 / animationSpeed,
            }}
            className="mb-8"
          >
            <div className="flex flex-row items-center justify-center gap-2">
              <p className="text-white/80">by</p>
              <Link href="https://zondax.ch" target="_blank" rel="noopener noreferrer">
                <Image
                  src="/assets/zondax-white.svg"
                  alt="Zondax Logo"
                  width={105}
                  height={48}
                  className="hover:opacity-80 transition-opacity duration-300"
                />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 1.8 / animationSpeed,
              duration: 1 / animationSpeed,
            }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-full sm:w-auto order-2 sm:order-1">
                <ActionButton
                  href="https://github.com/Zondax/polkadot-web-migration"
                  label="GitHub"
                  variant="secondary"
                  icon={<FaGithub className="h-5 w-5" />}
                  external
                />
              </div>
              <div className="w-full sm:w-auto order-1 sm:order-2">
                <ActionButton href="/migrate" label="Start Migration" variant="primary" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
