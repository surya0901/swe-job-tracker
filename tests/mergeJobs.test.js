import { describe, it, expect } from 'vitest'
import { mergeJobs } from '../src/lib/mergeJobs'

describe('mergeJobs: preservation of notes and application stages', () => {
  const catalogJobs = [
    { id: 'gh:acme:1', companyName: 'Acme', title: 'SWE, New Grad', status: 'open' },
    { id: 'gh:acme:2', companyName: 'Acme', title: 'SWE, Frontend New Grad', status: 'open' },
  ]

  it('defaults untouched catalog jobs to To Apply with no notes and marks them untracked', () => {
    const merged = mergeJobs(catalogJobs, {}, [])
    expect(merged[0].status).toBe('To Apply')
    expect(merged[0].notes).toBe('')
    expect(merged[0].tracked).toBe(false)
  })

  it('applies a saved status/notes override onto the matching job only', () => {
    const overrides = { 'gh:acme:1': { status: 'Interview', notes: 'Recruiter call 3/2' } }
    const merged = mergeJobs(catalogJobs, overrides, [])
    const job1 = merged.find((j) => j.id === 'gh:acme:1')
    const job2 = merged.find((j) => j.id === 'gh:acme:2')
    expect(job1.status).toBe('Interview')
    expect(job1.notes).toBe('Recruiter call 3/2')
    expect(job1.tracked).toBe(true)
    expect(job2.status).toBe('To Apply')
    expect(job2.tracked).toBe(false)
  })

  it('supports multiple jobs at the same company with independent progress', () => {
    const overrides = {
      'gh:acme:1': { status: 'Offer', notes: 'Backend role' },
      'gh:acme:2': { status: 'Rejected', notes: 'Frontend role' },
    }
    const merged = mergeJobs(catalogJobs, overrides, [])
    expect(merged.filter((j) => j.companyName === 'Acme')).toHaveLength(2)
    expect(merged.find((j) => j.id === 'gh:acme:1').status).toBe('Offer')
    expect(merged.find((j) => j.id === 'gh:acme:2').status).toBe('Rejected')
  })

  it('includes custom jobs verbatim, always tracked', () => {
    const customJobs = [{ id: 'custom-1', companyName: 'Small Startup', status: 'Applied', notes: 'from a friend', verified: false }]
    const merged = mergeJobs(catalogJobs, {}, customJobs)
    const custom = merged.find((j) => j.id === 'custom-1')
    expect(custom.tracked).toBe(true)
    expect(custom.status).toBe('Applied')
  })
})
