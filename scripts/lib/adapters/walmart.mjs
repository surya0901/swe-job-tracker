import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Walmart Careers' hybrid job search — the JSON its results page calls after
// load. Verified live (1,351 jobs at verification time). `jobPostingStartDate`
// is the employer's posting date; the description comes with each hit.
const ENDPOINT = 'https://careers.walmart.com/api/ai/search-ai/api/v1/combined/hybrid-search'
const PAGE_SIZE = 20

export async function fetchWalmartJobs({ queries = ['software engineer'], maxPages = 4 } = {}) {
  const byId = new Map()
  let coverageComplete = true
  for (const query of queries) {
    for (let page = 0; page < maxPages; page++) {
      const res = await fetchWithRetry(`${ENDPOINT}?page=${page}&size=${PAGE_SIZE}&locale=en_US`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Referer: 'https://careers.walmart.com/us/en/results',
        },
        body: JSON.stringify({ query, basicSearch: false, filter: '', locale: 'en_US' }),
      })
      if (!res.ok) {
        if (byId.size === 0 && page === 0) throw new Error(`Walmart careers search: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const data = await res.json()
      const list = Array.isArray(data.jobs) ? data.jobs : []
      const before = byId.size
      for (const j of list) byId.set(j.id, j)
      if (list.length < PAGE_SIZE || byId.size === before) break
      if (page === maxPages - 1) coverageComplete = false
    }
  }
  const jobs = [...byId.values()]
    .filter((j) => j.metadata?.primaryLocationCountry === 'US')
    .map((j) => {
      const m = j.metadata
      const location = [m.primaryLocationCity, m.primaryLocationState].filter(Boolean).join(', ')
      const url = `https://careers.walmart.com/us/en/job/${j.id}`
      return {
        sourceJobId: String(j.id),
        title: (m.title ?? m.jobPostingTitle ?? '').trim(),
        location,
        structuredCountry: 'United States',
        applyUrl: url,
        sourceUrl: url,
        description: (j.text ?? '').replace(/^Job Posting Title:[^\n]*\n?/, ''),
        postedAt: m.jobPostingStartDate ? new Date(m.jobPostingStartDate).toISOString() : null,
        postedAtProvenance: m.jobPostingStartDate ? 'employer_posted_date' : 'unavailable',
        sourceUpdatedAt: null,
        department: Array.isArray(m.areas) ? m.areas.join(', ') : '',
      }
    })
  return { jobs, coverageComplete }
}
