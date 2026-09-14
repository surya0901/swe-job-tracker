import { describe, it, expect } from 'vitest'
import { detectCountry, detectWorkArrangement } from '../scripts/lib/geography.mjs'

describe('detectCountry', () => {
  it('detects US from a state abbreviation', () => {
    expect(detectCountry('McLean, VA')).toBe('US')
  })

  it('detects US from an explicit country name', () => {
    expect(detectCountry('Remote - United States')).toBe('US')
  })

  it('detects a non-US country by name/city', () => {
    expect(detectCountry('Bangalore, India')).toBe('IN')
    expect(detectCountry('London, UK')).toBe('UK')
    expect(detectCountry('Toronto, Canada')).toBe('CA')
  })

  it('does not label a restricted/unrecognized location as US', () => {
    expect(detectCountry('Doha, Qatar')).toBe('QA')
  })

  it('returns Unspecified for empty or unparseable text', () => {
    expect(detectCountry('')).toBe('Unspecified')
    expect(detectCountry('Multiple Locations')).toBe('Unspecified')
  })
})

describe('detectWorkArrangement', () => {
  it('detects remote', () => {
    expect(detectWorkArrangement('Remote')).toBe('Remote')
  })

  it('detects hybrid', () => {
    expect(detectWorkArrangement('Hybrid - Austin, TX')).toBe('Hybrid')
  })

  it('does not conflate remote with "work from anywhere" scope claims', () => {
    // detectWorkArrangement only classifies onsite/hybrid/remote/unspecified
    // from the text — it never expands "Remote" into a claim about which
    // countries/regions are eligible.
    expect(detectWorkArrangement('Remote (US only)')).toBe('Remote')
  })

  it('returns Unspecified when arrangement is not stated', () => {
    expect(detectWorkArrangement('Austin, TX')).toBe('Unspecified')
  })
})
