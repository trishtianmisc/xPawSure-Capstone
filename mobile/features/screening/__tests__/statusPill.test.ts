import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { BOOKED_PILL, CONSULTED_PILL, screeningStatusPill } from '../constants.ts'

const testsDir = dirname(fileURLToPath(import.meta.url))

function readSource(relativePath: string): string {
  return readFileSync(resolve(testsDir, relativePath), 'utf8')
}

describe('screeningStatusPill', () => {
  it('shows Consulted once the visit is completed with a consultation', () => {
    assert.deepEqual(screeningStatusPill(true, true), CONSULTED_PILL)
  })

  it('shows Consulted even when no appointment is still open', () => {
    assert.deepEqual(screeningStatusPill(true, false), CONSULTED_PILL)
  })

  it('shows Booked while the scan only has an appointment', () => {
    assert.deepEqual(screeningStatusPill(false, true), BOOKED_PILL)
  })

  it('shows nothing for a scan with neither an appointment nor a consultation', () => {
    assert.equal(screeningStatusPill(false, false), null)
  })

  it('labels the two states distinctly', () => {
    assert.equal(CONSULTED_PILL.label, 'Consulted')
    assert.equal(BOOKED_PILL.label, 'Booked')
  })

  it('renders the scan status through the shared helper everywhere', () => {
    for (const file of [
      '../screens/ScreeningHistoryScreen.tsx',
      '../screens/ScreeningDetailsScreen.tsx',
      '../../records/screens/RecordsScreen.tsx',
      '../../pet/components/PetRecordRows.tsx',
      '../../../app/(owner)/index.tsx',
    ]) {
      const source = readSource(file)
      assert.match(source, /screeningStatusPill\(/, `${file} must use the shared helper`)
      assert.doesNotMatch(
        source,
        /BOOKED_PILL\./,
        `${file} must not branch on BOOKED_PILL directly`,
      )
    }
  })
})
