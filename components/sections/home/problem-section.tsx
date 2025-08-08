'use client'

import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

export default function ProblemSection() {
  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(to bottom, #f9f9ff, #ffffff)' }}>
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-linear-to-r from-purple-700 to-pink-600">
            The Problem
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="bg-white p-8 rounded-2xl shadow-lg border border-purple-100"
          >
            <h3 className="text-xl font-bold mb-4 text-gray-800">Complex Migration Process</h3>
            <p className="text-gray-700">
              While the new app is a leap forward, many users are left without the tools they need to switch over safely and confidently.
              Today, the migration process is still mostly manual, and there&apos;s no native interface to guide users through it.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-white p-8 rounded-2xl shadow-lg border border-purple-100"
          >
            <h3 className="text-xl font-bold mb-4 text-gray-800">Adoption Barriers</h3>
            <p className="text-gray-700">
              This complexity discourages users from upgrading, even when the benefits are clear. Without a streamlined process, many users
              continue using outdated applications, missing out on important security and usability improvements.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
