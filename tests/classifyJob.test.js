import { describe, it, expect } from 'vitest'
import { shouldInclude, isExcluded, detectProgramType } from '../scripts/lib/classifyJob.mjs'

describe('classifyJob: exclusion of internships and senior roles', () => {
  it('excludes internships', () => {
    expect(shouldInclude('Software Engineer Intern, Summer 2026')).toBe(false)
    expect(isExcluded('Software Engineering Internship')).toBe(true)
  })

  it('excludes co-ops', () => {
    expect(shouldInclude('Software Engineer Co-op')).toBe(false)
  })

  it('excludes senior/staff/principal roles', () => {
    expect(shouldInclude('Senior Software Engineer')).toBe(false)
    expect(shouldInclude('Staff Software Engineer')).toBe(false)
    expect(shouldInclude('Principal Engineer')).toBe(false)
  })

  it('excludes roles with an explicit years-of-experience gate', () => {
    expect(shouldInclude('Software Engineer (5+ years experience)')).toBe(false)
  })

  it('includes genuine new-grad / rotational software roles', () => {
    expect(shouldInclude('Software Engineer, New Grad')).toBe(true)
    expect(shouldInclude('Software Engineer - Technology Development Program (TDP)')).toBe(true)
  })

  it('excludes non-software roles even with new-grad language', () => {
    expect(shouldInclude('Finance Rotational Program, New Grad')).toBe(false)
  })
})

describe('classifyJob: program type detection', () => {
  it('detects rotational programs', () => {
    expect(detectProgramType('Technology Development Program (TDP)')).toBe('Rotational')
    expect(detectProgramType('Engineering Leadership Development Program')).toBe('Rotational')
  })

  it('defaults to standard for a plain new-grad title', () => {
    expect(detectProgramType('Software Engineer, New Grad')).toBe('Standard')
  })
})
