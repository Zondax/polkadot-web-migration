'use client'

import { motion } from 'framer-motion'
import { Users, Wallet, Zap } from 'lucide-react'

export default function AudienceSection() {
  const audiences = [
    {
      icon: Wallet,
      title: 'Users with Ledger Wallet devices',
      description: 'Anyone currently using a Ledger device to manage Substrate based assets',
      delay: 0.1,
    },
    {
      icon: Zap,
      title: 'Holders across parachains',
      description: 'Users with assets on Kusama, Astar, and other Substrate-based chains',
      delay: 0.2,
    },
    {
      icon: Users,
      title: 'Universal App adopters',
      description: 'Anyone looking to move to the new Polkadot Universal App without the headache',
      delay: 0.3,
    },
  ]

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
            Who It&apos;s For
          </h2>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            This tool is designed for users across the Polkadot ecosystem who want a seamless transition to the new Universal Ledger app.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {audiences.map((audience, index) => (
            <motion.div
              key={`audience-${audience.title}-${index}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: audience.delay }}
              className="bg-white p-8 rounded-xl shadow-md border border-purple-100 text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-r from-purple-600/20 to-pink-600/20 mb-6">
                <audience.icon className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">{audience.title}</h3>
              <p className="text-gray-600">{audience.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
