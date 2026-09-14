import { fetchWithRetry, mapWithConcurrency } from '../fetchWithRetry.mjs'
import { htmlToText } from '../htmlText.mjs'

// Workday's CXS (career site) API. This is the same unauthenticated JSON
// endpoint a company's own public careers page calls client-side — it is
// not a documented public API the way Greenhouse/Lever/Ashby are, so each
// tenant/site pair in scripts/companies.mjs has been individually
// verified by an actual successful call, not guessed.
const QUERIES = ['software engineer', 'technology development program', 'software developer']
const PAGE_SIZE = 20
const MAX_PAGES_PER_QUERY = 10 // operational cap — see listCoverageComplete
const MAX_DETAIL_FETCHES = 120 // operational cap — see detailCoverageComplete
const DETAIL_CONCURRENCY = 5

export async function fetchWorkdayJobs({ tenant, wd, site }) {
  const base = `https://${tenant}.${wd}.myworkdayjobs.com/wday/cxs/${tenant}/${site}`
  const candidatesByPath = new Map()
  let listCoverageComplete = true

  for (const searchText of QUERIES) {
    let page = 0
    let total = null
    while (page < MAX_PAGES_PER_QUERY) {
      const res = await fetchWithRetry(`${base}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appliedFacets: {}, limit: PAGE_SIZE, offset: page * PAGE_SIZE, searchText }),
      })
      if (!res.ok) {
        if (page === 0 && searchText === QUERIES[0]) {
          let detail = ''
          try {
            detail = (await res.text()).slice(0, 200)
          } catch {
            /* ignore */
          }
          throw new Error(`Workday ${tenant}/${site}: HTTP ${res.status} ${detail}`)
        }
        // A later page/query failing does not invalidate what we already
        // collected, but it DOES mean we didn't see the whole result set
        // for this tenant this run — never silently call that "complete".
        listCoverageComplete = false
        break
      }
      const data = await res.json()
      const postings = Array.isArray(data.jobPostings) ? data.jobPostings : []
      total = data.total ?? total
      for (const job of postings) {
        if (!job.externalPath) continue
        if (!candidatesByPath.has(job.externalPath)) candidatesByPath.set(job.externalPath, job)
      }
      page += 1
      const seenSoFar = page * PAGE_SIZE
      if (postings.length < PAGE_SIZE || (total !== null && seenSoFar >= total)) break // reached the end for this query
      if (page >= MAX_PAGES_PER_QUERY) {
        listCoverageComplete = false // hit the operational cap before `total`
      }
    }
  }

  const candidates = [...candidatesByPath.values()]
  const toFetchDetails = candidates.slice(0, MAX_DETAIL_FETCHES)
  const detailCoverageComplete = candidates.length <= MAX_DETAIL_FETCHES

  const details = await mapWithConcurrency(toFetchDetails, DETAIL_CONCURRENCY, async (job) => {
    try {
      const res = await fetchWithRetry(`${base}${job.externalPath}`, { timeoutMs: 10000, retries: 1 })
      if (!res.ok) return { job, detail: null }
      const data = await res.json()
      return { job, detail: data.jobPostingInfo ?? null }
    } catch {
      return { job, detail: null }
    }
  })
  const detailByPath = new Map(details.map((d) => [d.job.externalPath, d.detail]))

  const jobs = candidates.map((job) => {
    const detail = detailByPath.get(job.externalPath)
    const parsedPosted = parseWorkdayRelativeDate(detail?.postedOn ?? job.postedOn)
    const allLocations = detail
      ? [detail.location, ...(detail.additionalLocations ?? [])].filter(Boolean).join('; ')
      : job.locationsText || ''
    const structuredCountry = detail?.country?.descriptor ?? null
    return {
      sourceJobId: job.externalPath,
      title: job.title ?? '',
      location: allLocations,
      structuredCountry,
      applyUrl: `https://${tenant}.${wd}.myworkdayjobs.com/${site}${job.externalPath}`,
      sourceUrl: `https://${tenant}.${wd}.myworkdayjobs.com/${site}${job.externalPath}`,
      description: detail?.jobDescription ? htmlToText(detail.jobDescription) : '',
      postedAt: parsedPosted,
      postedAtProvenance: parsedPosted ? 'relative_text_parsed' : 'unavailable',
      postedAtRawText: detail?.postedOn ?? job.postedOn ?? null,
      sourceUpdatedAt: null,
      department: '',
      detailFetched: detailByPath.has(job.externalPath) && detail !== null,
    }
  })

  return {
    jobs,
    // A single boolean for collect.mjs's closure-eligibility gate; the
    // granular list-vs-detail breakdown is still exposed for diagnostics.
    coverageComplete: listCoverageComplete && detailCoverageComplete,
    listCoverageComplete,
    detailCoverageComplete,
    candidatesFound: candidates.length,
    detailsFetched: details.filter((d) => d.detail !== null).length,
  }
}

// Workday's list API gives a relative string, not a real timestamp —
// "Posted Today", "Posted Yesterday", "Posted N Days Ago", or
// "Posted 30+ Days Ago". We convert to an approximate ISO date but always
// keep postedAtRawText so the UI can show the original wording and label
// it as approximate rather than exact.
export function parseWorkdayRelativeDate(text, now = new Date()) {
  if (!text) return null
  const t = text.trim().toLowerCase()
  const dayMs = 24 * 60 * 60 * 1000
  if (t === 'posted today') return new Date(now.getTime()).toISOString()
  if (t === 'posted yesterday') return new Date(now.getTime() - dayMs).toISOString()
  // "Posted N Days Ago" is exact; "Posted N+ Days Ago" (e.g. "30+") is
  // Workday's own truncated/open-ended form once a count exceeds a
  // threshold — the "+" means "at least N", not "exactly N", so that
  // case deliberately falls through to null rather than being treated as
  // precise.
  const exactDaysAgo = t.match(/^posted (\d+) days? ago$/)
  if (exactDaysAgo) return new Date(now.getTime() - Number(exactDaysAgo[1]) * dayMs).toISOString()
  return null
}
