import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Ashby's public job-board API — documented, CORS-open, designed for
// embeddable job boards. https://developers.ashbyhq.com/docs/public-job-posting-api
export async function fetchAshbyJobs(boardToken) {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardToken)}?includeCompensation=false`
  const res = await fetchWithRetry(url)
  if (!res.ok) {
    throw new Error(`Ashby ${boardToken}: HTTP ${res.status}`)
  }
  const data = await res.json()
  const jobs = Array.isArray(data.jobs) ? data.jobs : []
  // Ashby's `publishedAt` is documented as when the posting was published
  // to the public job board — the closest thing to a genuine posted date
  // among these three sources.
  return jobs.map((job) => ({
    sourceJobId: String(job.id),
    title: job.title ?? '',
    location: job.location ?? job.locationName ?? '',
    applyUrl: job.applyUrl ?? job.jobUrl ?? '',
    sourceUrl: job.jobUrl ?? '',
    description: stripHtml(job.descriptionPlain ?? ''),
    postedAt: job.publishedAt ?? null,
    postedAtProvenance: job.publishedAt ? 'platform_published' : 'unavailable',
    sourceUpdatedAt: null,
    department: job.department ?? '',
  }))
}

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 2000)
}
