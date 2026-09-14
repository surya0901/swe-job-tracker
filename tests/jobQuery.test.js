import { describe, it, expect } from 'vitest'
import { filterJobs, sortJobs, paginate } from '../src/lib/jobQuery'

const jobs = Array.from({ length: 5 }, (_, i) => ({
  id: `job-${i}`,
  companyId: `co-${i}`,
  companyName: `Company ${i}`,
  title: 'Software Engineer, New Grad',
  industry: i % 2 === 0 ? 'Fintech' : 'Big Tech',
  programType: i % 2 === 0 ? 'Rotational' : 'Standard',
  eligibility: i === 0 ? 'rotational_tdp' : 'possibly_eligible',
  status: i === 4 ? 'closed' : 'open',
  location: i === 0 ? 'Remote' : 'New York, NY',
  country: i === 2 ? 'IN' : 'US',
  locationScope: i === 2 ? 'International' : 'US',
  verified: i !== 3,
  postedAt: `2026-01-0${i + 1}T00:00:00.000Z`,
  firstSeenAt: `2026-01-0${i + 1}T00:00:00.000Z`,
}))

describe('filterJobs', () => {
  it('filters by industry', () => {
    expect(filterJobs(jobs, { industry: 'Fintech' })).toHaveLength(3)
  })

  it('filters by availability: unverified excludes verified jobs', () => {
    const result = filterJobs(jobs, { availability: 'unverified' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('job-3')
  })

  it('filters by location substring, case-insensitively', () => {
    const result = filterJobs(jobs, { location: 'remote' })
    expect(result).toHaveLength(1)
  })

  it('search matches company name or title', () => {
    const result = filterJobs(jobs, { search: 'Company 2' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('job-2')
  })

  it('locationScope=US excludes a job identified as International', () => {
    const result = filterJobs(jobs, { locationScope: 'US' })
    expect(result.find((j) => j.id === 'job-2')).toBeUndefined()
  })

  it('locationScope=US does NOT include an Unknown-scope job unless explicitly toggled on', () => {
    const withUnknown = [...jobs, { ...jobs[0], id: 'job-unknown-loc', locationScope: 'Unknown' }]
    const excluded = filterJobs(withUnknown, { locationScope: 'US' })
    expect(excluded.find((j) => j.id === 'job-unknown-loc')).toBeUndefined()
    const included = filterJobs(withUnknown, { locationScope: 'US', includeUnknownLocations: true })
    expect(included.find((j) => j.id === 'job-unknown-loc')).toBeDefined()
  })

  it('an Unknown-scope job is never silently labeled International either', () => {
    const withUnknown = [...jobs, { ...jobs[0], id: 'job-unknown-loc', locationScope: 'Unknown' }]
    const result = filterJobs(withUnknown, { locationScope: 'International', includeUnknownLocations: true })
    expect(result.find((j) => j.id === 'job-unknown-loc')).toBeUndefined()
  })

  it('locationScope=International only returns non-US jobs', () => {
    const result = filterJobs(jobs, { locationScope: 'International' })
    expect(result.every((j) => j.locationScope !== 'US')).toBe(true)
  })

  it('hides needs_review jobs by default, keeping "open" and "eligible" as separate axes', () => {
    const withReview = jobs.map((j) => ({ ...j, reviewState: j.id === 'job-0' ? 'auto' : 'needs_review' }))
    const result = filterJobs(withReview, {})
    expect(result.every((j) => j.reviewState !== 'needs_review')).toBe(true)
  })

  it('includeNeedsReview shows needs_review jobs without changing their status', () => {
    const withReview = jobs.map((j) => ({ ...j, reviewState: j.id === 'job-0' ? 'auto' : 'needs_review' }))
    const result = filterJobs(withReview, { includeNeedsReview: true })
    const reviewJob = result.find((j) => j.id === 'job-1')
    expect(reviewJob).toBeDefined()
    expect(reviewJob.status).toBe('open') // status untouched by the eligibility review gate
  })

  it('filters by eligibility category', () => {
    const result = filterJobs(jobs, { eligibility: 'rotational_tdp' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('job-0')
  })

  it('postedWithin excludes jobs with no postedAt', () => {
    const withUnknown = [...jobs, { ...jobs[0], id: 'job-unknown', postedAt: null }]
    const result = filterJobs(withUnknown, { postedWithin: '7d' })
    expect(result.find((j) => j.id === 'job-unknown')).toBeUndefined()
  })

  it('recently_discovered only matches jobs with unknown postedAt seen recently', () => {
    const now = new Date().toISOString()
    const candidates = [
      { ...jobs[0], id: 'recent-unknown', postedAt: null, firstSeenAt: now },
      { ...jobs[0], id: 'old-unknown', postedAt: null, firstSeenAt: '2020-01-01T00:00:00.000Z' },
      { ...jobs[0], id: 'recent-known', postedAt: now, firstSeenAt: now },
    ]
    const result = filterJobs(candidates, { postedWithin: 'recently_discovered' })
    expect(result.map((j) => j.id)).toEqual(['recent-unknown'])
  })
})

describe('pagination', () => {
  it('splits results into pages of the given size', () => {
    const page1 = paginate(jobs, 1, 2)
    const page2 = paginate(jobs, 2, 2)
    const page3 = paginate(jobs, 3, 2)
    expect(page1).toHaveLength(2)
    expect(page2).toHaveLength(2)
    expect(page3).toHaveLength(1)
    expect(page1[0].id).toBe('job-0')
    expect(page3[0].id).toBe('job-4')
  })
})

describe('sortJobs', () => {
  it('sorts by company name A-Z', () => {
    const shuffled = [jobs[3], jobs[0], jobs[4], jobs[1], jobs[2]]
    const sorted = sortJobs(shuffled, 'company')
    expect(sorted.map((j) => j.id)).toEqual(['job-0', 'job-1', 'job-2', 'job-3', 'job-4'])
  })

  it('sorts by posted date, placing unknown dates last regardless of direction', () => {
    const withUnknown = [
      { id: 'a', companyName: 'A', postedAt: '2026-01-01T00:00:00.000Z' },
      { id: 'b', companyName: 'B', postedAt: null },
      { id: 'c', companyName: 'C', postedAt: '2026-03-01T00:00:00.000Z' },
    ]
    const sorted = sortJobs(withUnknown, 'posted')
    expect(sorted[sorted.length - 1].id).toBe('b')
    expect(sorted[0].id).toBe('c') // most recent first
  })

  it('rotational/relevance sort puts rotational_tdp ahead of possibly_eligible', () => {
    const sorted = sortJobs(jobs, 'relevance')
    expect(sorted[0].eligibility).toBe('rotational_tdp')
  })
})
