import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'

import { buildPetPublicUrl } from '../utils/qr.ts'

const ORIGINAL = process.env.EXPO_PUBLIC_WEB_URL

after(() => {
  if (ORIGINAL === undefined) delete process.env.EXPO_PUBLIC_WEB_URL
  else process.env.EXPO_PUBLIC_WEB_URL = ORIGINAL
})

describe('buildPetPublicUrl', () => {
  it('returns null when EXPO_PUBLIC_WEB_URL is unset or blank', () => {
    delete process.env.EXPO_PUBLIC_WEB_URL
    assert.equal(buildPetPublicUrl('ABC123'), null)
    process.env.EXPO_PUBLIC_WEB_URL = '   '
    assert.equal(buildPetPublicUrl('ABC123'), null)
  })

  it('builds the public pet URL from the configured base', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://pets.example.com'
    assert.equal(buildPetPublicUrl('ABC123'), 'https://pets.example.com/pets/ABC123/public')
  })

  it('trims trailing slashes from the base URL', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://pets.example.com///'
    assert.equal(buildPetPublicUrl('ABC123'), 'https://pets.example.com/pets/ABC123/public')
  })

  it('URL-encodes the QR code segment', () => {
    process.env.EXPO_PUBLIC_WEB_URL = 'https://pets.example.com'
    assert.equal(
      buildPetPublicUrl('a/b c'),
      'https://pets.example.com/pets/a%2Fb%20c/public',
    )
  })

  it('never falls back to localhost', () => {
    delete process.env.EXPO_PUBLIC_WEB_URL
    assert.equal(buildPetPublicUrl('ABC123'), null)
  })
})
