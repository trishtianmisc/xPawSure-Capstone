import { render, screen } from '@testing-library/react'

import { ConsultationSummary } from './ConsultationSummary'
import type { ScreeningSummary, VetConsultationInfo } from '../types/dashboard.types'

function makeConsultation(overrides: Partial<VetConsultationInfo> = {}): VetConsultationInfo {
  return {
    id: 'c1',
    appointment_id: 'a1',
    pet_id: 'p1',
    pet_name: 'Buddy',
    veterinarian: 'Dr. Smith',
    chief_complaint: 'Itching',
    subjective: null,
    objective: null,
    assessment: null,
    plan: null,
    diagnosis: '',
    specific_disease: null,
    treatment: null,
    notes: null,
    follow_up_required: false,
    follow_up_target_date: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function makeScreening(disease: string): ScreeningSummary {
  return {
    ais_id: 's1',
    disease,
    ais_confidence: 87,
    ais_model_version: 'v1.0',
    ais_status: 'COMPLETED',
    ais_source: 'ON_DEVICE',
    ais_created_at: '2026-01-01T00:00:00Z',
    image_url: null,
  }
}

describe('ConsultationSummary', () => {
  it('shows Matched when diagnosis equals the screening disease', () => {
    render(
      <ConsultationSummary
        consultation={makeConsultation({ diagnosis: 'Fungal' })}
        screening={makeScreening('Fungal')}
      />,
    )

    expect(screen.getByText('Diagnosis Agreement')).toBeInTheDocument()
    expect(screen.getByText('Matched')).toBeInTheDocument()
  })

  it('shows Matched when diagnosis contains the screening disease', () => {
    render(
      <ConsultationSummary
        consultation={makeConsultation({ diagnosis: 'Suspected Fungal infection' })}
        screening={makeScreening('Fungal')}
      />,
    )

    expect(screen.getByText('Matched')).toBeInTheDocument()
  })

  it('shows Not matched when diagnosis differs from the screening disease', () => {
    render(
      <ConsultationSummary
        consultation={makeConsultation({ diagnosis: 'Ear infection' })}
        screening={makeScreening('Fungal')}
      />,
    )

    expect(screen.getByText('Diagnosis Agreement')).toBeInTheDocument()
    expect(screen.getByText('Not matched')).toBeInTheDocument()
  })

  it('hides the row when there is no screening', () => {
    render(
      <ConsultationSummary
        consultation={makeConsultation({ diagnosis: 'Fungal' })}
        screening={null}
      />,
    )

    expect(screen.queryByText('Diagnosis Agreement')).not.toBeInTheDocument()
    expect(screen.queryByText('Matched')).not.toBeInTheDocument()
    expect(screen.queryByText('Not matched')).not.toBeInTheDocument()
  })

  it('shows Not matched when diagnosis is empty', () => {
    render(
      <ConsultationSummary
        consultation={makeConsultation({ diagnosis: '' })}
        screening={makeScreening('Fungal')}
      />,
    )

    expect(screen.getByText('Not matched')).toBeInTheDocument()
  })

  it('wraps long values inside their detail cell', () => {
    render(
      <ConsultationSummary
        consultation={makeConsultation({ notes: 'Start the prescribed medications.' })}
      />,
    )

    expect(screen.getByText('Start the prescribed medications.')).toHaveClass('break-words')
  })

  it('shows the specific disease beneath the diagnosis', () => {
    render(
      <ConsultationSummary
        consultation={makeConsultation({
          diagnosis: 'Fungal',
          specific_disease: 'Malassezia dermatitis',
        })}
      />,
    )

    expect(screen.getByText(/Specific disease: Malassezia dermatitis/)).toHaveClass(
      'text-xs',
      'font-normal',
    )
  })

  it('shows the preferred follow-up date with the follow-up value', () => {
    render(
      <ConsultationSummary
        consultation={makeConsultation({
          follow_up_required: true,
          follow_up_target_date: '2026-02-01',
        })}
      />,
    )

    expect(screen.getByText(/Needed/)).toHaveTextContent(
      'Preferred follow-up: Feb 1, 2026',
    )
  })
})
