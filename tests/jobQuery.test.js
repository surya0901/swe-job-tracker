import { describe, it, expect } from 'vitest'
import { filterJobs, sortJobs, paginate } from '../src/lib/jobQuery'

const jobs = Array.from({ length: 5 }, (_, i) => ({
  id: `job-${i}`,
  companyName: `Company ${i}`,
  title: 'Software Engineer, New Grad',
  industry: i % 2 === 0 ? 'Fintech' : 'Big Tech',
  programType: i % 2 === 0 ? 'Rotational' : 'Standard',
  status: i === 4 ? 'closed' : 'open',
  location: i === 0 ? 'Remote' : 'New York, NY',
  verified: i !== 3,
  postedAt: `2026-01-0${i + 1}T00:00:00.000Z`,
  discoveredAt: `2026-01-0${i + 1}T00:00:00.000Z`,
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
})
