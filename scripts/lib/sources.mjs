// Shared by the full collector (scripts/collect.mjs) and the fast alert
// watcher (scripts/lib/watch.mjs): how to turn a company directory entry
// into real fetched postings.

import { fetchGreenhouseJobs } from './adapters/greenhouse.mjs'
import { fetchLeverJobs } from './adapters/lever.mjs'
import { fetchAshbyJobs } from './adapters/ashby.mjs'
import { fetchWorkdayJobs } from './adapters/workday.mjs'
import { fetchAmazonJobs } from './adapters/amazon.mjs'
import { fetchAppleJobs } from './adapters/apple.mjs'
import { fetchJpmorganJobs } from './adapters/jpmorgan.mjs'
import { fetchOracleJobs } from './adapters/oracle.mjs'
import { fetchEightfoldJobs } from './adapters/eightfold.mjs'
import { fetchGoldmanJobs } from './adapters/goldman.mjs'
import { fetchGoogleJobs } from './adapters/google.mjs'
import { fetchMicrosoftJobs } from './adapters/microsoft.mjs'

// "full" is the thorough collection (deep paging); "watch" is the light
// newest-first poll used every minute — one or two pages, and Workday
// detail requests only for postings not seen before.
const ADAPTERS = {
  greenhouse: (source) => fetchGreenhouseJobs(source.token),
  lever: (source) => fetchLeverJobs(source.token),
  ashby: (source) => fetchAshbyJobs(source.token),
  workday: (source, { mode, skipSourceIds }) =>
    mode === 'watch'
      ? fetchWorkdayJobs(source, { queries: [''], maxPages: 2, maxDetails: 30, skipSourceIds })
      : fetchWorkdayJobs(source),
  apple: (_source, { mode }) => fetchAppleJobs({ query: 'software engineer', maxPages: mode === 'watch' ? 1 : 4 }),
  jpmorgan: (_source, { mode }) =>
    mode === 'watch'
      ? fetchJpmorganJobs({ keywords: ['software engineer', 'technology'], maxPages: 1 })
      : fetchJpmorganJobs({ maxPages: 3 }),
  oracle: (source, { mode }) =>
    fetchOracleJobs({
      host: source.host,
      site: source.site,
      keywords: mode === 'watch' ? ['software engineer'] : ['software engineer', 'software engineer program', 'technology'],
      maxPages: mode === 'watch' ? 1 : 3,
    }),
  eightfold: (source, { mode }) => fetchEightfoldJobs({ host: source.host, domain: source.domain, maxPages: mode === 'watch' ? 1 : 4 }),
  goldman: (_source, { mode }) =>
    fetchGoldmanJobs({ searchTerms: mode === 'watch' ? ['software engineer'] : ['software engineer', 'engineer'], maxPages: mode === 'watch' ? 1 : 3 }),
  google: (_source, { mode }) => fetchGoogleJobs({ queries: ['software engineer'], maxPages: mode === 'watch' ? 1 : 3 }),
  microsoft: (_source, { mode }) => fetchMicrosoftJobs({ queries: ['software engineer'], maxPages: mode === 'watch' ? 1 : 4 }),
  amazon: (_source, { mode }) =>
    fetchAmazonJobs({
      categories: ['software-development', 'systems-quality-security-engineering'],
      maxPages: mode === 'watch' ? 1 : 4,
    }),
}

// A source's stable identity component for job-id construction: the ATS
// board token, or the Workday tenant.
export function sourceKey(source) {
  return source.token ?? source.tenant ?? source.site ?? source.domain
}

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export async function collectFromCandidate(company, options = {}) {
  const { mode = 'full', skipIdsFor = null } = options
  const [name, industry, candidates] = company
  const companyId = slugify(name)
  const attempts = []

  for (const candidate of candidates) {
    const fetcher = ADAPTERS[candidate.adapter]
    try {
      const skipSourceIds = skipIdsFor ? skipIdsFor(candidate) : null
      const { jobs: rawJobs, coverageComplete, ...coverageStats } = await fetcher(candidate, { mode, skipSourceIds })
      attempts.push({ ...candidate, ok: true })
      return {
        companyId,
        name,
        industry,
        status: 'connected',
        source: candidate,
        attempts,
        rawJobs,
        coverageComplete,
        coverageStats,
        error: null,
      }
    } catch (err) {
      attempts.push({ ...candidate, ok: false, error: String(err.message ?? err) })
    }
  }

  return {
    companyId,
    name,
    industry,
    status: 'source_failing',
    source: null,
    attempts,
    rawJobs: [],
    error: attempts.map((a) => `${a.adapter}:${sourceKey(a)} -> ${a.error}`).join('; '),
  }
}
