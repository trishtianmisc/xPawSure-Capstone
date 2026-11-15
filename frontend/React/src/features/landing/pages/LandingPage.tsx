import { useEffect } from 'react'

import '../landing.css'
import { AboutSection } from '../components/AboutSection'
import { AIScreeningSection } from '../components/AIScreeningSection'
import { CallToActionSection } from '../components/CallToActionSection'
import { FeaturesSection } from '../components/FeaturesSection'
import { HeroSection } from '../components/HeroSection'
import { HowItWorksSection } from '../components/HowItWorksSection'
import { LandingFooter } from '../components/LandingFooter'
import { LandingNavbar } from '../components/LandingNavbar'
import { RolesSection } from '../components/RolesSection'

export function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = 'XPawSure — Smarter Veterinary Care'
    return () => {
      document.title = previousTitle
    }
  }, [])

  return (
    <div className="relative isolate min-h-screen bg-[#f3d1a3] text-[#3b1a0b] dark:bg-stone-950 dark:text-stone-100  ">
      
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-amber-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        href="#main-content"
      >
        Skip to content
      </a>

      <LandingNavbar />

      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AboutSection />
        <CallToActionSection/>
      </main>

      <LandingFooter />
    </div>
  )
}
