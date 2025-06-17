'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export default function FeatureSection() {
  return (
    <section className="py-20 px-4 bg-white">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-linear-to-r from-purple-700 to-pink-600">
            Why This Matters
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
            The latest Polkadot Ledger Application brings a major upgrade to the ecosystem. By consolidating support for multiple
            Substrate-based chains into one secure, universal app, it offers a smoother, more powerful experience for managing your assets.
          </p>
          <div className="mt-6 text-lg md:text-xl text-gray-700 font-medium">
            But migrating from older Ledger-based accounts can be complex.
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex justify-center"
        >
          <div className="relative w-full max-w-3xl">
            <div className="absolute inset-0 bg-linear-to-r from-purple-500/20 to-pink-500/20 rounded-2xl transform rotate-1 scale-105" />
            <div className="relative bg-white p-8 md:p-10 rounded-2xl shadow-xl border border-purple-100">
              <div className="flex items-center justify-center mb-6">
                <a
                  href="https://zondax.ch/blog/all-in-one-polkadot-app-is-here-2"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="w-16 h-16 rounded-full bg-linear-to-r from-purple-600 to-pink-600 flex items-center justify-center hover:scale-105 transition-transform">
                    <ArrowRight className="w-8 h-8 text-white" />
                  </div>
                </a>
              </div>
              <h3 className="text-2xl font-bold text-center mb-4 text-gray-800">The Universal Ledger App Advantage</h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-linear-to-r from-purple-600 to-pink-600 flex items-center justify-center mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="ml-3 text-gray-700">One app for all Substrate-based chains</span>
                </li>
                <li className="flex items-start">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-linear-to-r from-purple-600 to-pink-600 flex items-center justify-center mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="ml-3 text-gray-700">Enhanced security features</span>
                </li>
                <li className="flex items-start">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-linear-to-r from-purple-600 to-pink-600 flex items-center justify-center mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="ml-3 text-gray-700">Improved transaction management</span>
                </li>
                <li className="flex items-start">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-linear-to-r from-purple-600 to-pink-600 flex items-center justify-center mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <span className="ml-3 text-gray-700">Future-proof for ecosystem growth</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
