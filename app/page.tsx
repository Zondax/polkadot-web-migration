import AudienceSection from '@/components/sections/home/audience-section'
import CallToAction from '@/components/sections/home/call-to-action'
import FeatureSection from '@/components/sections/home/feature-section'
import { HomePage } from '@/components/sections/home/home-page'
import ProblemSection from '@/components/sections/home/problem-section'
import SolutionSection from '@/components/sections/home/solution-section'

export default function LandingPage() {
  return (
    <main id="main-content" className="min-h-screen">
      {/* Hero Section */}
      <HomePage
        title="Welcome to the Polkadot Ledger Migration Assistant"
        subtitle="Simplifying your journey to the new Polkadot Universal Ledger App"
      />

      {/* Feature Section */}
      <FeatureSection />

      {/* Problem Section */}
      <ProblemSection />

      {/* Solution Section */}
      <SolutionSection />

      {/* Audience Section */}
      <AudienceSection />

      {/* Call to Action */}
      <CallToAction />
    </main>
  )
}
