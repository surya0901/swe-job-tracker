// Loads the published, collector-generated dataset (public/data/*.json).
// This is real data fetched over the network — not a client-side crawl.
// Cache-busted so "Refresh Openings" reliably gets the latest published
// snapshot instead of a stale cached copy.

const BASE = import.meta.env.BASE_URL

async function fetchJson(filename) {
  const url = `${BASE}data/${filename}?t=${Date.now()}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load ${filename}: HTTP ${res.status}`)
  }
  return res.json()
}

export async function loadCatalog() {
  const [companies, jobs, meta] = await Promise.all([
    fetchJson('companies.json'),
    fetchJson('jobs.json'),
    fetchJson('collection-meta.json'),
  ])
  return { companies, jobs, meta, fetchedAt: new Date().toISOString() }
}
