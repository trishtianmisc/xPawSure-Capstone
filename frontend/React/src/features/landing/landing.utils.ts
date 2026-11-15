export interface LandingNavItem {
  id: string
  label: string
}

export const LANDING_NAV_ITEMS: LandingNavItem[] = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'about', label: 'About Us' },
  { id: 'contact', label: 'Contact' },
]

const NAV_OFFSET = 80

export const APP_LINKS = {
  googlePlay: 'https://expo.dev/accounts/trishtianmisc/projects/xpawsure/builds/814a49d9-7c6a-4e0f-bf32-b7cbafbd84d6',
}

export function scrollToSection(id: string): void {
  const target = document.getElementById(id)
  if (!target) return

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET

  window.scrollTo({
    top: Math.max(top, 0),
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  })
}
