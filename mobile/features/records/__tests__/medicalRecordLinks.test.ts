import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import { consultationLinkLabel, consultationNavigation, screeningNavigation } from '../lib/medicalRecordLinks.ts'

const testsDir = dirname(fileURLToPath(import.meta.url))

function readSource(relativePath: string): string {
  return readFileSync(resolve(testsDir, relativePath), 'utf8')
}

describe('consultation and screening navigation', () => {
  it('opens the exact linked scan and carries the source consultation', () => {
    assert.deepEqual(screeningNavigation('visit-1', 'scan-1'), {
      action: 'open',
      href: {
        pathname: '/(owner)/screenings/[id]',
        params: { id: 'scan-1', fromConsultation: 'visit-1' },
      },
    })
  })

  it('opens the exact consultation and carries the source scan', () => {
    assert.deepEqual(consultationNavigation('scan-1', 'visit-1'), {
      action: 'open',
      href: {
        pathname: '/(owner)/records/consultations/[id]',
        params: { id: 'visit-1', fromScreening: 'scan-1' },
      },
    })
  })

  it('returns to the original record instead of pushing a navigation loop', () => {
    assert.deepEqual(screeningNavigation('visit-1', 'scan-1', 'scan-1'), {
      action: 'return', href: '/(owner)/screenings/scan-1',
    })
    assert.deepEqual(consultationNavigation('scan-1', 'visit-1', 'visit-1'), {
      action: 'return', href: '/(owner)/records/consultations/visit-1',
    })
  })

  it('opens a different follow-up consultation rather than returning to the original visit', () => {
    const destination = consultationNavigation('scan-1', 'follow-up', 'visit-1')
    assert.equal(destination.action, 'open')
    assert.deepEqual(destination.href, {
      pathname: '/(owner)/records/consultations/[id]',
      params: { id: 'follow-up', fromScreening: 'scan-1' },
    })
  })

  it('labels the original and follow-up links differently', () => {
    assert.equal(consultationLinkLabel('ORIGINAL'), 'View Consultation')
    assert.equal(consultationLinkLabel('FOLLOW_UP'), 'View Follow-up Consultation')
  })

  it('loads screening details by ID, not by searching the first history page', () => {
    const source = readSource('../../screening/screens/ScreeningDetailsScreen.tsx')
    assert.match(source, /useScreening\(id\)/)
    assert.doesNotMatch(source, /useAllScreenings|results\.find/)
    assert.match(source, /screening\.linked_consultations/)
    assert.match(source, /consultationLinkLabel\(consultation\.kind\)/)
  })

  it('returns to the source record across tab stacks with navigate, not dismissTo', () => {
    // Records and Screenings are sibling tab stacks. POP_TO only reaches routes
    // inside the focused stack, so a router.dismissTo here logs "not handled by
    // any navigator" and leaves the user on the same screen.
    for (const file of [
      '../hooks/useMedicalRecordLinks.ts',
      '../../screening/hooks/useScreeningDetailBack.ts',
    ]) {
      const source = readSource(file)
      assert.match(source, /router\.navigate\(/, `${file} must return with navigate`)
      assert.doesNotMatch(source, /router\.dismissTo/, `${file} must not use dismissTo`)
    }

    const recordBack = readSource('../lib/recordNavigation.ts')
    assert.match(recordBack, /router\.navigate\(backHref\)/)
    // The records root is in the same stack, so dismissTo still applies there.
    assert.match(recordBack, /router\.dismissTo\('\/\(owner\)\/records'\)/)
  })

  it('exposes screening history as a Scans section inside the Records tab', () => {
    const records = readSource('../screens/RecordsScreen.tsx')
    assert.match(records, /value: 'screenings', label: 'Scans'/)
    assert.match(records, /useAllScreenings\(\)/)
    assert.match(records, /pathname: '\/\(owner\)\/screenings\/\[id\]'/)
    const nav = readSource('../lib/recordNavigation.ts')
    assert.match(nav, /'screenings'/)
  })
})
