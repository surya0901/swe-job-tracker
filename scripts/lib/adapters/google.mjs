import { fetchWithRetry } from '../fetchWithRetry.mjs'
import { htmlToText } from '../htmlText.mjs'

// Google Careers renders its results server-side into an AF_initDataCallback
// block (key 'ds:1'). Each record carries the job id, title, apply link, the
// description sections, locations and a publish timestamp (Unix seconds).
// Verified live; there is no separate public JSON API.
const RESULTS = 'https://www.google.com/about/careers/applications/jobs/results/'

function parseRecords(html) {
  const m = html.match(/AF_initDataCallback\(\{key: 'ds:1', hash: '[^']*', data:(.*?), sideChannel/s)
  if (!m) return null
  const data = JSON.parse(m[1])
  return Array.isArray(data?.[0]) ? data[0] : []
}

export async function fetchGoogleJobs({ queries = ['software engineer', 'software engineer early career'], maxPages = 3 } = {}) {
  const byId = new Map()
  let coverageComplete = true
  for (const q of queries) {
    for (let page = 1; page <= maxPages; page++) {
      // No target_level filter: Google's 'EARLY' tag returns mostly data-center
      // technician roles, while the plain software query returns the software
      // roles (new-grad ones included) that the classifier needs.
      const params = new URLSearchParams({ q, location: 'United States', sort_by: 'date', page: String(page) })
      const res = await fetchWithRetry(`${RESULTS}?${params}`, { headers: { Accept: 'text/html' } })
      if (!res.ok) {
        if (byId.size === 0 && page === 1) throw new Error(`Google Careers: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const records = parseRecords(await res.text())
      if (records === null) {
        if (byId.size === 0 && page === 1) throw new Error('Google Careers: results format not recognized')
        coverageComplete = false
        break
      }
      const before = byId.size
      for (const r of records) byId.set(r[0], r)
      if (records.length === 0 || byId.size === before) break
      if (page === maxPages) coverageComplete = false
    }
  }
  const jobs = [...byId.values()].map((r) => {
    const sections = [r[3]?.[1], r[4]?.[1], r[10]?.[1], r[19]?.[1]].filter(Boolean).map(htmlToText)
    const loc = r[9]?.[0]?.[0] ?? ''
    const created = r[12]?.[0]
    const url = r[2]
    return {
      sourceJobId: String(r[0]),
      title: (r[1] ?? '').trim(),
      location: loc,
      structuredCountry: r[9]?.[0]?.[5] === 'US' ? 'United States' : null,
      applyUrl: url,
      sourceUrl: url,
      description: sections.join('\n\n'),
      postedAt: created ? new Date(created * 1000).toISOString() : null,
      postedAtProvenance: created ? 'platform_created' : 'unavailable',
      sourceUpdatedAt: null,
      department: '',
    }
  })
  return { jobs, coverageComplete }
}
