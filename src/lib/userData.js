// Personal application data ONLY: status/notes overrides on real catalog
// jobs, plus manually-added custom jobs. Never the catalog itself — that
// always comes fresh from the network (see catalog.js). This is the fix
// for the old bug where a full copy of the (mock) company list was saved
// to localStorage and silently shadowed every future catalog update.

const KEY = 'swe-tracker:userdata:v2'
const OLD_KEY = 'swe-tracker:companies:v1'

function emptyState() {
  return { overrides: {}, customJobs: [] }
}

export function loadUserData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        overrides: parsed?.overrides ?? {},
        customJobs: Array.isArray(parsed?.customJobs) ? parsed.customJobs : [],
      }
    }
  } catch {
    // fall through to migration / empty state
  }

  const migrated = migrateFromV1()
  return migrated ?? emptyState()
}

export function saveUserData(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // localStorage unavailable — app still works in-memory for this session
  }
}

// v1 stored one flat list of "companies" that mixed catalog data (name,
// program, industry — now supplied fresh by the collector) with personal
// data (status, notes). We keep only the personal parts: any entry the
// user actually changed the status of, added notes to, or added by hand
// via "+ Add Company" (identified by its timestamp-based id) is preserved
// as an unverified custom job so nothing the user typed is lost. Entries
// that were still at their untouched seed default carry no real user
// data and are safely dropped.
function migrateFromV1() {
  try {
    const raw = localStorage.getItem(OLD_KEY)
    if (!raw) return null
    const oldCompanies = JSON.parse(raw)
    if (!Array.isArray(oldCompanies)) return null

    const customJobs = []
    for (const co of oldCompanies) {
      const isUserAdded = /^co-\d{5,}$/.test(co.id ?? '')
      const hasProgress = (co.status && co.status !== 'To Apply') || Boolean(co.notes?.trim())
      if (!isUserAdded && !hasProgress) continue

      customJobs.push({
        id: `custom-migrated-${co.id}`,
        companyName: co.name,
        title: co.programName || 'Manually added',
        industry: co.industry || 'Unspecified',
        programType: co.programType || 'Standard',
        location: co.location || 'Not specified',
        applyUrl: co.url || '',
        sourceUrl: '',
        description: '',
        status: co.status || 'To Apply',
        notes: co.notes || '',
        verified: false,
        addedAt: co.dateAdded || new Date().toISOString().slice(0, 10),
        migratedFromV1: true,
      })
    }

    const state = { overrides: {}, customJobs }
    saveUserData(state)
    return state
  } catch {
    return null
  }
}
