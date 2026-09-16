import { fetchWithRetry } from '../fetchWithRetry.mjs'
import { htmlToText } from '../htmlText.mjs'

// Greenhouse's public job-board API. Documented for embedding job boards on
// a company's own site — CORS-open, no auth required.
// https://developers.greenhouse.io/job-board.html
export async function fetchGreenhouseJobs(boardToken) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`
  const res = await fetchWithRetry(url)
  if (!res.ok) {
    throw new Error(`Greenhouse ${boardToken}: HTTP ${res.status}`)
  }
  const data = await res.json()
  const jobs = Array.isArray(data.jobs) ? data.jobs : []
  // Greenhouse's public job-board API does not expose a genuine "posted"
  // date — `updated_at` is a platform last-modified timestamp (bumped on
  // any edit, not just initial publish), so it must NOT be treated as
  // postedAt. We surface it only as sourceUpdatedAt.
  return { jobs: jobs.map((job) => ({
    sourceJobId: String(job.id),
    title: job.title ?? '',
    location: job.location?.name ?? '',
    applyUrl: job.absolute_url ?? '',
    sourceUrl: job.absolute_url ?? '',
    description: htmlToText(job.content),
    postedAt: null,
    postedAtProvenance: 'unavailable',
    sourceUpdatedAt: job.updated_at ?? null,
    department: job.departments?.[0]?.name ?? '',
  })), coverageComplete: true }
}

