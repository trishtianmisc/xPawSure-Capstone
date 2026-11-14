import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { ThemeContext } from '../../../context/ThemeContext'
import { LandingPage } from './LandingPage'

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <ThemeContext.Provider
        value={{ theme: 'light', toggleTheme: () => undefined, setTheme: () => undefined }}
      >
        <LandingPage />
      </ThemeContext.Provider>
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('renders the public landing page with navigation, login access, and screening disclaimer', () => {
    renderLandingPage()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /smarter veterinary care, better pet health/i,
      }),
    ).toBeInTheDocument()

    expect(screen.getAllByRole('link', { name: 'Login' }).length).toBeGreaterThan(0)
    const getStartedLinks = screen.getAllByRole('link', { name: /get started/i })
    expect(getStartedLinks.length).toBeGreaterThan(0)
    expect(getStartedLinks.every((link) => link.getAttribute('href') === '/login')).toBe(true)

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /ai-assisted screening for better veterinary insights/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/does not replace professional veterinary examination/i),
    ).toBeInTheDocument()

    expect(screen.getAllByRole('link', { name: /support@xpawsure\.com/i }).length).toBeGreaterThan(0)
  })
})
