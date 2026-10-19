import { fetchWithRetry } from '../fetchWithRetry.mjs'
import { htmlToText } from '../htmlText.mjs'

// amazon.jobs' own search endpoint — the same unauthenticated JSON that
// amazon.jobs calls from the browser. Not a documented public API, so it
// was verified with live requests (US filter, full-time schedule field,
// sort=recent) rather than assumed.
//
// Sorted newest-first, so the first page or two always contain whatever
// just opened — which is what the alert watcher needs. The collector
// passes a larger page budget for a fuller picture.
const PAGE_SIZE = 100

function postedIso(text) {
  // "October 19, 2026" — a date-only value published by Amazon itself.
  const d = new Date(`${text} 12:00:00 UTC`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function fetchAmazonJobs({ categories = ['software-development'], maxPages = 3 } = {}) {
  const byId = new Map()
  let coverageComplete = true

  for (const category of categories) {
    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({
        result_limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        sort: 'recent',
      })
      params.append('category[]', category)
      params.append('normalized_country_code[]', 'USA')
      const res = await fetchWithRetry(`https://www.amazon.jobs/en/search.json?${params}`)
      if (!res.ok) {
        if (page === 0 && byId.size === 0) throw new Error(`Amazon: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const data = await res.json()
      const batch = Array.isArray(data.jobs) ? data.jobs : []
      for (const job of batch) byId.set(job.id_icims, job)
      if (batch.length < PAGE_SIZE) break
      if (page === maxPages - 1) coverageComplete = false // more pages exist than we read
    }
  }

  const jobs = [...byId.values()]
    // Part-time / non-full-time roles are not what this tracker is for.
    .filter((job) => !job.job_schedule_type || job.job_schedule_type === 'full-time')
    .map((job) => ({
      sourceJobId: String(job.id_icims),
      title: (job.title ?? '').trim(),
      location: job.normalized_location || job.location || '',
      structuredCountry: job.country_code === 'USA' ? 'United States' : null,
      applyUrl: job.url_next_step || `https://www.amazon.jobs${job.job_path}`,
      sourceUrl: `https://www.amazon.jobs${job.job_path}`,
      // Qualifications carry the "N+ years" requirement text the
      // eligibility classifier reads — they must be part of the text.
      description: htmlToText(
        [job.description, `Basic qualifications: ${job.basic_qualifications ?? ''}`, `Preferred qualifications: ${job.preferred_qualifications ?? ''}`].join('\n'),
      ),
      postedAt: postedIso(job.posted_date),
      postedAtProvenance: job.posted_date ? 'employer_posted_date' : 'unavailable',
      sourceUpdatedAt: null,
      department: job.job_family ?? '',
    }))

  return { jobs, coverageComplete }
}
