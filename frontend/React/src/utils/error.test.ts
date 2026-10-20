import { describe, expect, it } from 'vitest'
import { apiErrorMessage } from './error'

function axiosLikeError(status: number, data: unknown): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data },
  })
}

describe('apiErrorMessage', () => {
  it('returns detail for {"detail": "..."} bodies', () => {
    const error = axiosLikeError(429, {
      detail: 'Request was throttled. Expected available in 30 seconds.',
    })
    expect(apiErrorMessage(error)).toBe(
      'Request was throttled. Expected available in 30 seconds.',
    )
  })

  it('returns the real login message for non_field_errors bodies', () => {
    const error = axiosLikeError(400, {
      non_field_errors: ['Invalid email or password.'],
    })
    expect(apiErrorMessage(error)).toBe('Invalid email or password.')
  })

  it('joins multiple field errors', () => {
    const error = axiosLikeError(400, {
      first_name: ['This field is required.'],
      phone: ['Phone must be in format 09XXXXXXXXX or +63XXXXXXXXXX.'],
    })
    expect(apiErrorMessage(error)).toBe(
      'This field is required., Phone must be in format 09XXXXXXXXX or +63XXXXXXXXXX.',
    )
  })

  it('flattens index-keyed nested dicts (operating hours shape)', () => {
    const error = axiosLikeError(400, {
      '1': { closing_time: ['Must be after opening time.'] },
      '3': { opening_time: ['Required when clinic is open.'] },
    })
    expect(apiErrorMessage(error)).toBe(
      'Must be after opening time., Required when clinic is open.',
    )
    expect(apiErrorMessage(error)).not.toContain('[object Object]')
  })

  it('falls back to err.message for network errors without a response', () => {
    const error = new Error('Network Error')
    expect(apiErrorMessage(error)).toBe('Network Error')
  })

  it('falls back to err.message when the response body is not an object', () => {
    const error = Object.assign(new Error('Request failed with status code 502'), {
      response: { status: 502, data: 'Bad Gateway' },
    })
    expect(apiErrorMessage(error)).toBe('Request failed with status code 502')
  })

  it('returns a generic message for null, undefined, and non-Error values', () => {
    expect(apiErrorMessage(null)).toBe('An unexpected error occurred.')
    expect(apiErrorMessage(undefined)).toBe('An unexpected error occurred.')
    expect(apiErrorMessage('boom')).toBe('An unexpected error occurred.')
    expect(apiErrorMessage(400)).toBe('An unexpected error occurred.')
  })
})
