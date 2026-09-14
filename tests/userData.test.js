import { describe, it, expect, beforeEach } from 'vitest'

function makeMemoryStorage() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
}

beforeEach(() => {
  globalThis.localStorage = makeMemoryStorage()
  // userData.js is re-imported fresh each test via dynamic import + vi
  // module reset isn't needed here since it holds no module-level state.
})

describe('userData: migration from v1', () => {
  it('starts empty when there is nothing saved', async () => {
    const { loadUserData } = await import('../src/lib/userData')
    const state = loadUserData()
    expect(state.overrides).toEqual({})
    expect(state.customJobs).toEqual([])
  })

  it('drops untouched seed-default entries (no real user data to preserve)', async () => {
    localStorage.setItem(
      'swe-tracker:companies:v1',
      JSON.stringify([{ id: 'co-1', name: 'Capital One', status: 'To Apply', notes: '' }]),
    )
    const { loadUserData } = await import('../src/lib/userData')
    const state = loadUserData()
    expect(state.customJobs).toHaveLength(0)
  })

  it('preserves an entry whose status was actually changed', async () => {
    localStorage.setItem(
      'swe-tracker:companies:v1',
      JSON.stringify([
        { id: 'co-3', name: 'Goldman Sachs', programName: 'New Analyst Program', status: 'Interview', notes: '', industry: 'Finance', programType: 'Rotational', location: 'NYC' },
      ]),
    )
    const { loadUserData } = await import('../src/lib/userData')
    const state = loadUserData()
    expect(state.customJobs).toHaveLength(1)
    expect(state.customJobs[0].companyName).toBe('Goldman Sachs')
    expect(state.customJobs[0].status).toBe('Interview')
    expect(state.customJobs[0].migratedFromV1).toBe(true)
  })

  it('preserves an entry whose notes were written even if status is still default', async () => {
    localStorage.setItem(
      'swe-tracker:companies:v1',
      JSON.stringify([
        { id: 'co-4', name: 'Boeing', status: 'To Apply', notes: 'Referral from Jane', industry: 'Aerospace', programType: 'Rotational', location: 'Seattle' },
      ]),
    )
    const { loadUserData } = await import('../src/lib/userData')
    const state = loadUserData()
    expect(state.customJobs).toHaveLength(1)
    expect(state.customJobs[0].notes).toBe('Referral from Jane')
  })

  it('preserves a user-added company (timestamp id) even with default status/no notes', async () => {
    localStorage.setItem(
      'swe-tracker:companies:v1',
      JSON.stringify([
        { id: 'co-1758300000000', name: 'My Local Startup', status: 'To Apply', notes: '', industry: 'SaaS', programType: 'Standard', location: 'Remote' },
      ]),
    )
    const { loadUserData } = await import('../src/lib/userData')
    const state = loadUserData()
    expect(state.customJobs).toHaveLength(1)
    expect(state.customJobs[0].companyName).toBe('My Local Startup')
  })

  it('handles an empty/missing saved list without throwing', async () => {
    localStorage.setItem('swe-tracker:companies:v1', JSON.stringify([]))
    const { loadUserData } = await import('../src/lib/userData')
    expect(() => loadUserData()).not.toThrow()
  })

  it('handles corrupted storage without throwing', async () => {
    localStorage.setItem('swe-tracker:companies:v1', '{not valid json')
    const { loadUserData } = await import('../src/lib/userData')
    const state = loadUserData()
    expect(state.overrides).toEqual({})
    expect(state.customJobs).toEqual([])
  })
})
