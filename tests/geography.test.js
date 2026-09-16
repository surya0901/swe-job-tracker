import { describe, it, expect } from 'vitest'
import { detectCountry, detectLocationScope, detectWorkArrangement } from '../scripts/lib/geography.mjs'

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

  it('prefers a structured country hint over text guessing when given', () => {
    expect(detectCountry('Some Office', 'United States of America')).toBe('US')
    expect(detectCountry('Some Office', 'India')).toBe('IN')
  })

  it('returns Unspecified for a bare location count with no real place names', () => {
    expect(detectCountry('3 Locations')).toBe('Unspecified')
    expect(detectCountry('Multiple Locations')).toBe('Unspecified')
  })

  it('returns Unspecified for empty text', () => {
    expect(detectCountry('')).toBe('Unspecified')
  })
})

describe('detectLocationScope: distinct US / International / Mixed / Unknown states', () => {
  it('US-only locations scope to US', () => {
    expect(detectLocationScope('McLean, VA')).toBe('US')
    expect(detectLocationScope('McLean, VA; Richmond, VA')).toBe('US')
  })

  it('non-US locations scope to International', () => {
    expect(detectLocationScope('Bangalore, India')).toBe('International')
  })

  it('a posting spanning both US and international offices scopes to Mixed', () => {
    expect(detectLocationScope('McLean, VA; Bangalore, India')).toBe('Mixed')
  })

  it('an unparseable location scopes to Unknown, never silently to US', () => {
    expect(detectLocationScope('3 Locations')).toBe('Unknown')
    expect(detectLocationScope('')).toBe('Unknown')
  })

  it('never labels an unknown location as International either', () => {
    const scope = detectLocationScope('Somewhere Unrecognizable Xyz')
    expect(scope).not.toBe('International')
    expect(scope).toBe('Unknown')
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
