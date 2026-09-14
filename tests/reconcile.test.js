import { describe, it, expect } from 'vitest'
import { normalizeJob, reconcileJobs, shouldKeepPreviousDataset } from '../scripts/lib/reconcile.mjs'

const company = { companyId: 'acme', name: 'Acme', industry: 'SaaS' }
const source = { adapter: 'greenhouse', token: 'acme' }

function makeRaw(sourceJobId, title = 'Software Engineer, New Grad') {
  return {
    sourceJobId,
    title,
    location: 'Remote',
    applyUrl: `https://acme.example/${sourceJobId}`,
    sourceUrl: `https://acme.example/${sourceJobId}`,
    description: 'desc',
    postedAt: '2026-01-01T00:00:00.000Z',
  }
}

describe('normalizeJob: multiple jobs at one company', () => {
  it('produces distinct stable ids for two different postings at the same company', () => {
    const previousById = new Map()
    const jobA = normalizeJob({ company, source, raw: makeRaw('111'), nowIso: '2026-02-01T00:00:00.000Z', previousById })
    const jobB = normalizeJob({ company, source, raw: makeRaw('222'), nowIso: '2026-02-01T00:00:00.000Z', previousById })

    expect(jobA.id).not.toBe(jobB.id)
    expect(jobA.companyId).toBe('acme')
    expect(jobB.companyId).toBe('acme')
  })
})

describe('normalizeJob: unknown vs employer-provided dates', () => {
  it('keeps postedAt null (unknown) when the source never provided one, rather than inventing it', () => {
    const previousById = new Map()
    const raw = { ...makeRaw('333'), postedAt: null }
    const job = normalizeJob({ company, source, raw, nowIso: '2026-02-01T00:00:00.000Z', previousById })
    expect(job.postedAt).toBeNull()
  })

  it('preserves a previously-known postedAt if a later fetch omits it', () => {
    const previousById = new Map([
      ['greenhouse:acme:333', { postedAt: '2026-01-05T00:00:00.000Z', discoveredAt: '2026-01-05T00:00:00.000Z' }],
    ])
    const raw = { ...makeRaw('333'), postedAt: null }
    const job = normalizeJob({ company, source, raw, nowIso: '2026-02-01T00:00:00.000Z', previousById })
    expect(job.postedAt).toBe('2026-01-05T00:00:00.000Z')
    expect(job.discoveredAt).toBe('2026-01-05T00:00:00.000Z') // discovery date never moves
  })
})

describe('reconcileJobs: deduplication across repeated refreshes', () => {
  it('does not duplicate a job that appears again in a fresh run', () => {
    const previousJobs = [{ id: 'greenhouse:acme:111', companyId: 'acme', status: 'open', missCount: 0 }]
    const freshJobs = [{ id: 'greenhouse:acme:111', companyId: 'acme', status: 'open', missCount: 0 }]
    const result = reconcileJobs({
      freshJobs,
      previousJobs,
      succeededCompanyIds: new Set(['acme']),
      nowIso: '2026-02-01T00:00:00.000Z',
    })
    const matches = result.filter((j) => j.id === 'greenhouse:acme:111')
    expect(matches).toHaveLength(1)
  })
})

describe('reconcileJobs: no false closures after failed checks', () => {
  it('leaves a job untouched if its company source failed this run', () => {
    const previousJobs = [{ id: 'greenhouse:acme:111', companyId: 'acme', status: 'open', missCount: 2 }]
    const result = reconcileJobs({
      freshJobs: [],
      previousJobs,
      succeededCompanyIds: new Set(), // acme's source failed this run
      nowIso: '2026-02-01T00:00:00.000Z',
    })
    expect(result[0].status).toBe('open')
    expect(result[0].missCount).toBe(2) // unchanged, not incremented
  })

  it('only closes a job after 3 consecutive misses on a succeeding source', () => {
    let jobs = [{ id: 'greenhouse:acme:111', companyId: 'acme', status: 'open', missCount: 0 }]
    for (let i = 0; i < 2; i++) {
      jobs = reconcileJobs({
        freshJobs: [],
        previousJobs: jobs,
        succeededCompanyIds: new Set(['acme']),
        nowIso: '2026-02-01T00:00:00.000Z',
      })
      expect(jobs[0].status).toBe('open')
    }
    jobs = reconcileJobs({
      freshJobs: [],
      previousJobs: jobs,
      succeededCompanyIds: new Set(['acme']),
      nowIso: '2026-02-01T00:00:00.000Z',
    })
    expect(jobs[0].status).toBe('closed')
    expect(jobs[0].missCount).toBe(3)
  })

  it('resets miss count to 0 if the job reappears before being closed', () => {
    const afterOneMiss = reconcileJobs({
      freshJobs: [],
      previousJobs: [{ id: 'greenhouse:acme:111', companyId: 'acme', status: 'open', missCount: 0 }],
      succeededCompanyIds: new Set(['acme']),
      nowIso: '2026-02-01T00:00:00.000Z',
    })
    expect(afterOneMiss[0].missCount).toBe(1)

    const reappeared = reconcileJobs({
      freshJobs: [{ id: 'greenhouse:acme:111', companyId: 'acme', status: 'open', missCount: 0 }],
      previousJobs: afterOneMiss,
      succeededCompanyIds: new Set(['acme']),
      nowIso: '2026-02-01T00:00:00.000Z',
    })
    expect(reappeared[0].missCount).toBe(0)
    expect(reappeared[0].status).toBe('open')
  })
})

describe('reconcileJobs: partial source failures preserve unrelated companies', () => {
  it('keeps jobs from a failing company while updating jobs from a succeeding one', () => {
    const previousJobs = [
      { id: 'greenhouse:acme:111', companyId: 'acme', status: 'open', missCount: 0 },
      { id: 'greenhouse:globex:222', companyId: 'globex', status: 'open', missCount: 0 },
    ]
    const freshJobs = [{ id: 'greenhouse:acme:111', companyId: 'acme', status: 'open', missCount: 0 }]
    const result = reconcileJobs({
      freshJobs,
      previousJobs,
      succeededCompanyIds: new Set(['acme']), // globex failed this run
      nowIso: '2026-02-01T00:00:00.000Z',
    })
    const globex = result.find((j) => j.companyId === 'globex')
    expect(globex.status).toBe('open')
    expect(globex.missCount).toBe(0)
  })
})

describe('shouldKeepPreviousDataset guardrail', () => {
  it('keeps the previous dataset when every source failed', () => {
    expect(
      shouldKeepPreviousDataset({ connectedCount: 0, attemptedCount: 10, previousOpenCount: 50, freshOpenCount: 0 }),
    ).toBe(true)
  })

  it('keeps the previous dataset on a catastrophic drop from a healthy baseline', () => {
    expect(
      shouldKeepPreviousDataset({ connectedCount: 2, attemptedCount: 10, previousOpenCount: 100, freshOpenCount: 5 }),
    ).toBe(true)
  })

  it('publishes normally when collection looks healthy', () => {
    expect(
      shouldKeepPreviousDataset({ connectedCount: 8, attemptedCount: 10, previousOpenCount: 40, freshOpenCount: 37 }),
    ).toBe(false)
  })

  it('does not trigger the drop guardrail when the previous baseline was small', () => {
    expect(
      shouldKeepPreviousDataset({ connectedCount: 1, attemptedCount: 10, previousOpenCount: 5, freshOpenCount: 0 }),
    ).toBe(false)
  })
})
