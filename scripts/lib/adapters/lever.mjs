import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Lever's public postings API — documented, CORS-open, designed for
// embeddable job boards. https://github.com/lever/postings-api
export async function fetchLeverJobs(boardToken) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(boardToken)}?mode=json`
  const res = await fetchWithRetry(url)
  if (!res.ok) {
    throw new Error(`Lever ${boardToken}: HTTP ${res.status}`)
  }
  const data = await res.json()
  const jobs = Array.isArray(data) ? data : []
  return jobs.map((job) => ({
    sourceJobId: String(job.id),
    title: job.text ?? '',
    location: job.categories?.location ?? '',
    applyUrl: job.applyUrl ?? job.hostedUrl ?? '',
    sourceUrl: job.hostedUrl ?? '',
    description: stripHtml((job.descriptionPlain ?? job.description ?? '')),
    postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
    department: job.categories?.team ?? '',
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
