'use client'

import { motion } from 'framer-motion'
import { CheckCircle, Link2, Lock, Search } from 'lucide-react'

export default function SolutionSection() {
  const features = [
    {
      icon: Link2,
      title: 'Connect your Ledger device directly in your browser',
      description: 'Seamless connection with your hardware wallet without additional software',
      delay: 0.1,
    },
    {
      icon: Search,
      title: "See which accounts are ready to migrate—and which aren't",
      description: "Clear visibility into your accounts' migration status",
      delay: 0.2,
    },
    {
      icon: CheckCircle,
      title: 'Follow a step-by-step guide through the migration process',
      description: 'Intuitive interface that walks you through each stage of migration',
      delay: 0.3,
    },
    {
      icon: Lock,
      title: 'Stay secure with clear instructions and no hidden risks',
      description: 'Security-focused approach with transparent processes',
      delay: 0.4,
    },
  ]

  return (
    <section className="py-20 px-4" style={{ background: 'linear-gradient(to bottom, #ffffff, #f5f0ff)' }}>
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-clip-text text-transparent bg-linear-to-r from-purple-700 to-pink-600">
            Our Solution
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
            We&apos;re building a dedicated web app to make this migration simple, secure, and transparent.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={`feature-${feature.title}-${index}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: feature.delay }}
              className="bg-white p-6 rounded-xl shadow-md border border-purple-100 flex items-start"
            >
              <div className="shrink-0 mr-4">
                <div className="w-12 h-12 rounded-full bg-linear-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-gray-800">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 bg-linear-to-r from-purple-600/10 to-pink-600/10 p-8 rounded-2xl"
        >
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-purple-700 to-pink-600">
              The Migration Assistant
            </h3>
            <p className="text-gray-700 text-lg">
              No more manual steps. Just a smooth, guided transition to the future of Ledger experience.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
