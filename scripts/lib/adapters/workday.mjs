import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Workday's CXS (career site) API. This is the same unauthenticated JSON
// endpoint a company's own public careers page calls client-side — it is
// not a documented public API the way Greenhouse/Lever/Ashby are, so each
// tenant/site pair here has been individually verified by an actual
// successful call (see scripts/companies.mjs comments), not guessed.
//
// A single tenant can host many thousands of postings across every job
// family, and Workday's full-text search is fuzzy (it does not reliably
// restrict to an exact phrase). To keep this bounded and reasonably
// on-topic without a description-level fetch per posting (which would be
// one HTTP call per job — infeasible at this scale), we run a short list
// of targeted queries per tenant and merge+dedupe the results, then let
// scripts/lib/classifyJob.mjs filter on title (Workday's list response
// does not include full descriptions, only title/location/timeType/dates
// — so unlike Greenhouse, Workday-sourced jobs are classified on title
// only; this is a real, documented limitation, not an oversight).
const QUERIES = ['software engineer', 'technology development program', 'software developer']
const PAGE_SIZE = 20
const MAX_PAGES_PER_QUERY = 2

export async function fetchWorkdayJobs({ tenant, wd, site }) {
  const base = `https://${tenant}.${wd}.myworkdayjobs.com/wday/cxs/${tenant}/${site}`
  const seenPaths = new Map()

  for (const searchText of QUERIES) {
    for (let page = 0; page < MAX_PAGES_PER_QUERY; page++) {
      const res = await fetchWithRetry(`${base}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appliedFacets: {},
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
          searchText,
        }),
      })
      if (!res.ok) {
        if (page === 0 && searchText === QUERIES[0]) {
          throw new Error(`Workday ${tenant}/${site}: HTTP ${res.status}`)
        }
        break // later queries/pages failing after a first success is not fatal
      }
      const data = await res.json()
      const postings = Array.isArray(data.jobPostings) ? data.jobPostings : []
      for (const job of postings) {
        if (!job.externalPath) continue
        if (!seenPaths.has(job.externalPath)) seenPaths.set(job.externalPath, job)
      }
      if (postings.length < PAGE_SIZE) break // last page for this query
    }
  }

  return [...seenPaths.values()].map((job) => {
    const parsedPosted = parseWorkdayRelativeDate(job.postedOn)
    return {
      sourceJobId: job.externalPath,
      title: job.title ?? '',
      location: job.locationsText ?? '',
      applyUrl: `https://${tenant}.${wd}.myworkdayjobs.com/${site}${job.externalPath}`,
      sourceUrl: `https://${tenant}.${wd}.myworkdayjobs.com/${site}${job.externalPath}`,
      description: '', // not available from the list endpoint
      postedAt: parsedPosted,
      postedAtProvenance: parsedPosted ? 'relative_text_parsed' : 'unavailable',
      postedAtRawText: job.postedOn ?? null,
      sourceUpdatedAt: null,
      department: '',
    }
  })
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
  return null // "30+ Days Ago" and unrecognized formats stay unknown rather than guessed
}
