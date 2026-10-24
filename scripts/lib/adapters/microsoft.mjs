import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Microsoft Careers (Eightfold-powered apply site). The search API only
// answers requests that carry the session cookie the careers page sets, so
// we load the page first and reuse its cookie. Verified live (789 results
// at verification time). `postedTs` is the posting timestamp, Unix seconds.
const PAGE = 'https://apply.careers.microsoft.com/careers'
const API = 'https://apply.careers.microsoft.com/api/pcsx/search'
const PAGE_SIZE = 10

function apiUrl(query, start) {
  return `${API}?domain=microsoft.com&query=${encodeURIComponent(query)}&location=United%20States&start=${start}&sort_by=timestamp`
}

async function sessionCookie(query) {
  const res = await fetchWithRetry(`${PAGE}?query=${encodeURIComponent(query)}&location=United%20States`, { headers: { Accept: 'text/html' } })
  if (!res.ok) throw new Error(`Microsoft careers page: HTTP ${res.status}`)
  await res.text()
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
}

export async function fetchMicrosoftJobs({ queries = ['software engineer'], maxPages = 4 } = {}) {
  const byId = new Map()
  let coverageComplete = true
  for (const query of queries) {
    const cookie = await sessionCookie(query)
    for (let page = 0; page < maxPages; page++) {
      const res = await fetchWithRetry(apiUrl(query, page * PAGE_SIZE), {
        headers: { Accept: 'application/json', Cookie: cookie, Referer: `${PAGE}?query=${encodeURIComponent(query)}&location=United%20States` },
      })
      if (!res.ok) {
        if (byId.size === 0 && page === 0) throw new Error(`Microsoft careers search: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const data = (await res.json())?.data
      const list = Array.isArray(data?.positions) ? data.positions : []
      const before = byId.size
      for (const p of list) byId.set(p.id, p)
      if (list.length < PAGE_SIZE || byId.size === before) break
      if (page === maxPages - 1) coverageComplete = false
    }
  }
  const jobs = [...byId.values()].map((p) => {
    const locations = parseList(p.standardizedLocations)
    return {
      sourceJobId: String(p.id),
      title: (p.name ?? '').trim(),
      location: locations.join('; '),
      structuredCountry: locations.some((l) => /, US$/.test(l)) ? 'United States' : null,
      applyUrl: `https://apply.careers.microsoft.com${p.positionUrl ?? `/careers/job/${p.id}`}`,
      sourceUrl: `https://apply.careers.microsoft.com${p.positionUrl ?? `/careers/job/${p.id}`}`,
      description: [p.department, p.workLocationOption ? `Work location: ${p.workLocationOption}` : ''].filter(Boolean).join('\n'),
      postedAt: p.postedTs ? new Date(Number(p.postedTs) * 1000).toISOString() : null,
      postedAtProvenance: p.postedTs ? 'employer_posted_date' : 'unavailable',
      sourceUpdatedAt: null,
      department: p.department ?? '',
    }
  })
  return { jobs, coverageComplete }
}

function parseList(value) {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value !== 'string') return []
  return [...value.matchAll(/'([^']+)'/g)].map((m) => m[1])
}
