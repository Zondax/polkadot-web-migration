'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

import { GradientBackground } from '../migrate/background'

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
  const words = title.split(' ')

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Background with gradient and animations */}
      <GradientBackground showBlobs={false} showPaths={true} animationSpeed={animationSpeed} />

      <div className="relative z-20 container mx-auto px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 / animationSpeed }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-6 tracking-tighter">
            {words.map((word, wordIndex) => (
              <span key={`word-${word}`} className="inline-block mr-4 last:mr-0">
                {word.split('').map((letter, letterIndex) => (
                  <motion.span
                    key={`letter-${word}-${letter}`}
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: (wordIndex * 0.1 + letterIndex * 0.03) / animationSpeed,
                      type: 'spring',
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block text-transparent bg-clip-text 
                    bg-linear-to-r from-white to-white/80"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h1>

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
            className="mb-6"
          >
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/20">
              <span className="text-sm text-white/80 italic ">Beta: This project is still in development</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 1.8 / animationSpeed,
              duration: 1 / animationSpeed,
            }}
            className="mb-8"
          >
            <div className="flex flex-row items-center justify-center gap-2">
              <p className="text-white/80">by</p>
              <Image src="/assets/zondax-white.svg" alt="Zondax Logo" width={105} height={48} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 2 / animationSpeed,
              duration: 1 / animationSpeed,
            }}
          >
            <div
              className="inline-block group relative p-px rounded-2xl backdrop-blur-lg 
                      overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
              }}
            >
              <Link href="/migrate">
                <Button
                  variant="ghost"
                  className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md 
                          bg-white/95 hover:bg-white 
                          border border-white/20 hover:shadow-md
                          group-hover:-translate-y-0.5 transition-all duration-300"
                  style={{ color: '#FF2670' }}
                >
                  <span className="opacity-90 group-hover:opacity-100 transition-opacity">Start Migration</span>
                  <span
                    className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 
                            transition-all duration-300"
                  >
                    →
                  </span>
                </Button>
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
