import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Eightfold-hosted careers sites (Microsoft, Morgan Stanley, Qualcomm, ...).
// Their search API (/api/pcsx/search) only answers requests carrying the
// session cookie that the careers page sets, so we load the page first and
// reuse its cookie with a matching Referer. Verified live per company.
// `postedTs` is the posting timestamp in Unix seconds.
const PAGE_SIZE = 10

function pageUrl(host, query) {
  return `https://${host}/careers?query=${encodeURIComponent(query)}&location=United%20States`
}

function apiUrl(host, domain, query, start) {
  return `https://${host}/api/pcsx/search?domain=${encodeURIComponent(domain)}&query=${encodeURIComponent(query)}&location=United%20States&start=${start}&sort_by=timestamp`
}

async function sessionCookie(host, query) {
  const res = await fetchWithRetry(pageUrl(host, query), { headers: { Accept: 'text/html' } })
  if (!res.ok) throw new Error(`${host} careers page: HTTP ${res.status}`)
  await res.text()
  return (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ')
}

export async function fetchEightfoldPcsxJobs({ host, domain, queries = ['software engineer'], maxPages = 4 }) {
  const byId = new Map()
  let coverageComplete = true
  for (const query of queries) {
    const cookie = await sessionCookie(host, query)
    for (let page = 0; page < maxPages; page++) {
      const res = await fetchWithRetry(apiUrl(host, domain, query, page * PAGE_SIZE), {
        headers: { Accept: 'application/json', Cookie: cookie, Referer: pageUrl(host, query) },
      })
      if (!res.ok) {
        if (byId.size === 0 && page === 0) throw new Error(`${host} careers search: HTTP ${res.status}`)
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
    const url = `https://${host}${p.positionUrl ?? `/careers/job/${p.id}`}`
    return {
      sourceJobId: String(p.id),
      title: (p.name ?? '').trim(),
      location: locations.join('; '),
      structuredCountry: locations.some((l) => /, US$/.test(l)) ? 'United States' : null,
      applyUrl: url,
      sourceUrl: url,
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
