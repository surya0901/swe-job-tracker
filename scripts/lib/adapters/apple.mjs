import { fetchWithRetry } from '../fetchWithRetry.mjs'

// jobs.apple.com's own search endpoint (the JSON its careers site calls).
// Not a documented API — verified with live requests. Newest-first, with
// `postDateInGMT` as a real employer-published timestamp. The list gives
// only a short summary, not the full requirements text.
const PAGE_SIZE = 20 // Apple's fixed page size

export async function fetchAppleJobs({ query = 'software engineer', maxPages = 3 } = {}) {
  const byId = new Map()
  let coverageComplete = true
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchWithRetry('https://jobs.apple.com/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query,
        filters: { locations: ['postLocation-USA'] },
        page,
        locale: 'en-us',
        sort: 'newest',
        format: { longDate: 'MMMM D, YYYY', mediumDate: 'MMM D, YYYY' },
      }),
    })
    if (!res.ok) {
      if (page === 1) throw new Error(`Apple: HTTP ${res.status}`)
      coverageComplete = false
      break
    }
    const data = await res.json()
    const batch = data?.res?.searchResults ?? []
    for (const job of batch) byId.set(job.positionId, job)
    if (batch.length < PAGE_SIZE) break
    if (page === maxPages) coverageComplete = false
  }

  const jobs = [...byId.values()].map((job) => {
    const locs = (job.locations ?? [])
      .map((l) => [l.city, l.stateProvince, l.countryName].filter(Boolean).join(', '))
      .filter(Boolean)
    return {
      sourceJobId: String(job.positionId),
      title: (job.postingTitle ?? '').trim(),
      location: locs.join('; '),
      structuredCountry: (job.locations ?? [])[0]?.countryName ?? null,
      applyUrl: `https://jobs.apple.com/en-us/details/${job.positionId}/${job.transformedPostingTitle ?? ''}`,
      sourceUrl: `https://jobs.apple.com/en-us/details/${job.positionId}/${job.transformedPostingTitle ?? ''}`,
      description: job.jobSummary ?? '',
      postedAt: job.postDateInGMT ? new Date(job.postDateInGMT).toISOString() : null,
      postedAtProvenance: job.postDateInGMT ? 'employer_posted_date' : 'unavailable',
      sourceUpdatedAt: null,
      department: job.team?.teamName ?? '',
    }
  })
  return { jobs, coverageComplete }
}
