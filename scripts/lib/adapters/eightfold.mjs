import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Eightfold's public apply API — the JSON behind an Eightfold-hosted careers
// site (e.g. explore.jobs.netflix.net). Verified live. `t_create` is the
// employer's posting timestamp in Unix seconds.
export async function fetchEightfoldJobs({ host, domain, maxPages = 3, pageSize = 10 }) {
  const byId = new Map()
  let coverageComplete = true
  for (let page = 0; page < maxPages; page++) {
    const res = await fetchWithRetry(
      `https://${host}/api/apply/v2/jobs?domain=${encodeURIComponent(domain)}&start=${page * pageSize}&num=${pageSize}&sort_by=new`,
    )
    if (!res.ok) {
      if (page === 0) throw new Error(`Eightfold ${host}: HTTP ${res.status}`)
      coverageComplete = false
      break
    }
    const data = await res.json()
    const list = Array.isArray(data.positions) ? data.positions : []
    for (const p of list) byId.set(p.id, p)
    if (list.length < pageSize) break
    if (page === maxPages - 1) coverageComplete = false
  }
  const jobs = [...byId.values()].map((p) => ({
    sourceJobId: String(p.id),
    title: (p.name ?? '').trim(),
    location: p.location ?? (p.locations ?? []).join('; '),
    structuredCountry: null,
    applyUrl: p.canonicalPositionUrl ?? `https://${host}/careers/job/${p.id}`,
    sourceUrl: p.canonicalPositionUrl ?? `https://${host}/careers/job/${p.id}`,
    description: [p.department, p.business_unit].filter(Boolean).join('\n'),
    postedAt: p.t_create ? new Date(p.t_create * 1000).toISOString() : null,
    postedAtProvenance: p.t_create ? 'employer_posted_date' : 'unavailable',
    sourceUpdatedAt: null,
    department: p.department ?? '',
  }))
  return { jobs, coverageComplete }
}
