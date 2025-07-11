'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function CallToAction() {
  return (
    <section
      className="py-20 px-4"
      style={{
        background: 'linear-gradient(to bottom right, #6B46C1, #9333EA, #FF2670)',
      }}
    >
      <div className="container mx-auto max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Ready to Upgrade Your Ledger Experience?</h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto mb-10">
            Start migrating to benefit from the Universal Ledger Polkadot App.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
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
                  <ArrowRight className="ml-2 h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
                </Button>
              </Link>
            </div>

            <div
              className="inline-block group relative p-px rounded-2xl backdrop-blur-lg 
                        overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              style={{
                background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))',
              }}
            >
              <Button
                variant="ghost"
                className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md 
                          bg-transparent hover:bg-white/10
                          border border-white/20 hover:shadow-md text-white
                          group-hover:-translate-y-0.5 transition-all duration-300"
              >
                <span className="opacity-90 group-hover:opacity-100 transition-opacity">Learn More</span>
              </Button>
            </div>
          </div>

          <p className="mt-8 text-white/70 text-sm">This application is currently under development.</p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5"
          >
            <Link
              href="https://zondax.ch/terms-of-use"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 hover:text-white/90 text-sm underline underline-offset-2 transition-colors duration-200"
            >
              Terms & Conditions
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
