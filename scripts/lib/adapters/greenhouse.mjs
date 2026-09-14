import { fetchWithRetry } from '../fetchWithRetry.mjs'

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
  return jobs.map((job) => ({
    sourceJobId: String(job.id),
    title: job.title ?? '',
    location: job.location?.name ?? '',
    applyUrl: job.absolute_url ?? '',
    sourceUrl: job.absolute_url ?? '',
    description: stripHtml(job.content ?? ''),
    postedAt: job.updated_at ?? null,
    department: job.departments?.[0]?.name ?? '',
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
