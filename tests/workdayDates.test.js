import { describe, it, expect } from 'vitest'
import { parseWorkdayRelativeDate } from '../scripts/lib/adapters/workday.mjs'

const NOW = new Date('2026-03-15T12:00:00.000Z')

describe('parseWorkdayRelativeDate: relative text, not a fabricated date', () => {
  it('parses "Posted Today" as now', () => {
    expect(parseWorkdayRelativeDate('Posted Today', NOW)).toBe(NOW.toISOString())
  })

  it('parses "Posted Yesterday" as one day back', () => {
    const result = new Date(parseWorkdayRelativeDate('Posted Yesterday', NOW))
    expect(NOW.getTime() - result.getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('parses "Posted N Days Ago"', () => {
    const result = new Date(parseWorkdayRelativeDate('Posted 5 Days Ago', NOW))
    expect(NOW.getTime() - result.getTime()).toBe(5 * 24 * 60 * 60 * 1000)
  })

  it('does NOT guess a date for "Posted 30+ Days Ago" — stays unknown rather than approximated', () => {
    expect(parseWorkdayRelativeDate('Posted 30+ Days Ago', NOW)).toBeNull()
  })

  it('returns null for missing/unrecognized text rather than defaulting to today', () => {
    expect(parseWorkdayRelativeDate(null, NOW)).toBeNull()
    expect(parseWorkdayRelativeDate('', NOW)).toBeNull()
    expect(parseWorkdayRelativeDate('Some unexpected format', NOW)).toBeNull()
  })
})
