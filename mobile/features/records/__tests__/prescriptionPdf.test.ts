import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { PrescriptionRecord } from '../../../src/services/records.ts'
import {
  buildPrescriptionPdfHtml,
  calculatePetAge,
  escapeHtml,
  formatClinicLine,
  formatRoute,
} from '../lib/prescriptionPdf.ts'

function prescription(
  overrides: Partial<PrescriptionRecord> = {},
): PrescriptionRecord {
  return {
    id: 'prs-1',
    consultation_id: 'con-1',
    pet_id: 'pet-1',
    pet_name: 'Rex',
    pet_breed: 'Labrador',
    pet_sex: 'MALE',
    pet_birth_date: '2020-01-01',
    pet_weight: '12.50',
    pet_color: 'Golden',
    owner_name: 'Olivia Owner',
    veterinarian: 'Vera Vet',
    vet_license_number: 'VET-1234',
    clinic_name: 'Happy Paws Clinic',
    clinic_address: '123 Bark Street, Manila',
    clinic_phone: '555-0100',
    instructions: 'Give with food',
    items: [
      {
        id: 'item-1',
        medicine_name: 'Apoquel',
        generic_name: 'Oclacitinib',
        dosage: '5.4 mg',
        frequency: 'Twice daily',
        duration: '14 days',
        route: 'ORAL',
        quantity: 28,
        notes: 'After meals',
      },
    ],
    created_at: '2026-11-11T12:00:00Z',
    ...overrides,
  }
}

describe('prescriptionPdf', () => {
  it('renders the clinic, owner, pet, medication, and signature details', () => {
    const html = buildPrescriptionPdfHtml(prescription())

    assert.match(html, /Vera Vet, DVM/)
    assert.match(html, /Happy Paws Clinic/)
    assert.match(html, /123 Bark Street, Manila/)
    assert.match(html, /555-0100/)
    assert.match(html, /Olivia Owner/)
    assert.match(html, /Rex/)
    assert.match(html, /Labrador/)
    assert.match(html, /Golden/)
    assert.match(html, /12.50 kg/)
    assert.match(html, /Apoquel/)
    assert.match(html, /Oclacitinib/)
    assert.match(html, /After meals/)
    assert.match(html, />Oral</)
    assert.match(html, /Give with food/)
    assert.match(html, /VET-1234/)
    assert.match(html, /November 11, 2026/)
  })

  it('escapes HTML from prescription values', () => {
    const html = buildPrescriptionPdfHtml(
      prescription({
        pet_name: '<script>alert("pet")</script>',
        owner_name: 'Owner & <b>Friend</b>',
        instructions: 'Use <daily>\nand "as needed"',
        items: [
          {
            id: 'item-1',
            medicine_name: '<img src=x onerror=alert(1)>',
            generic_name: null,
            dosage: '1 ml',
            frequency: 'Daily',
            duration: '3 days',
            route: 'ORAL',
            quantity: null,
            notes: null,
          },
        ],
      }),
    )

    assert.doesNotMatch(html, /<script>alert\("pet"\)<\/script>/)
    assert.doesNotMatch(html, /<img src=x/)
    assert.match(html, /&lt;script&gt;alert\(&quot;pet&quot;\)&lt;\/script&gt;/)
    assert.match(html, /Owner &amp; &lt;b&gt;Friend&lt;\/b&gt;/)
    assert.match(html, /Use &lt;daily&gt;<br \/>and &quot;as needed&quot;/)
  })

  it('states when a prescription has no medications', () => {
    const html = buildPrescriptionPdfHtml(prescription({ items: [] }))
    assert.match(html, /No medications listed\./)
  })

  it('formats clinic lines and routes', () => {
    assert.equal(
      formatClinicLine('Happy Paws Clinic', '123 Bark Street'),
      'Happy Paws Clinic · 123 Bark Street',
    )
    assert.equal(formatClinicLine('Happy Paws Clinic', null), 'Happy Paws Clinic')
    assert.equal(formatRoute('ORAL'), 'Oral')
    assert.equal(formatRoute('UNKNOWN'), 'UNKNOWN')
    assert.equal(formatRoute(null), '—')
  })

  it('calculates pet age from a date-only birth date', () => {
    assert.equal(calculatePetAge('2020-01-01', new Date(2026, 10, 11)), '6 yrs')
    assert.equal(calculatePetAge('2025-11-12', new Date(2026, 10, 11)), '<1 yr')
    assert.equal(calculatePetAge(null, new Date(2026, 10, 11)), '—')
  })

  it('escapes ampersands first without double-escaping', () => {
    assert.equal(escapeHtml('A & B < C'), 'A &amp; B &lt; C')
    assert.equal(escapeHtml(null), '')
  })
})
