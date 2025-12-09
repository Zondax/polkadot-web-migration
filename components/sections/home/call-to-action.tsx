'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

import { ActionButton } from './action-buttons'

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
            <div className="w-full sm:w-auto order-2 sm:order-1">
              <ActionButton href="https://docs.zondax.ch/polkadot-migration-app" label="Learn More" variant="secondary" external />
            </div>
            <div className="w-full sm:w-auto order-1 sm:order-2">
              <ActionButton href="/migrate" label="Start Migration" variant="primary" />
            </div>
          </div>

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
