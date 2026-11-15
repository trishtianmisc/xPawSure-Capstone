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
      screen.queryByText('Veterinary clinic management + AI-assisted screening'),
    ).not.toBeInTheDocument()
    expect(screen.getByAltText('XPawSure web appointments preview')).toBeInTheDocument()
    expect(screen.getByText('Appointments · click to see the next screen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show next preview/i })).toBeInTheDocument()
    expect(screen.getByText('Mobile app review')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /get the android app/i })).toHaveAttribute(
      'href',
      'https://expo.dev/accounts/trishtianmisc/projects/xpawsure/builds/814a49d9-7c6a-4e0f-bf32-b7cbafbd84d6',
    )
    expect(screen.queryByText('Illustrative interface preview')).not.toBeInTheDocument()

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /ai-assisted screening for better veterinary insights/i,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/does not replace professional veterinary examination/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Screening supports, never replaces, veterinary judgment')).toBeInTheDocument()

    expect(screen.getAllByRole('link', { name: /support@xpawsure\.com/i }).length).toBeGreaterThan(0)
  })
})
