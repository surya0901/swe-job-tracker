import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Oracle Recruiting Cloud candidate-experience REST endpoint — the JSON that
// a company's Oracle-hosted careers site calls. Each tenant has its own host
// and site number; both are verified live per company in companies.mjs.
export async function fetchOracleJobs({ host, site, keywords = [''], maxPages = 2, pageSize = 50 }) {
  const byId = new Map()
  let coverageComplete = true
  for (const keyword of keywords) {
    for (let page = 0; page < maxPages; page++) {
      const keywordPart = keyword ? `,keyword=${encodeURIComponent(keyword)}` : ''
      const finder = `findReqs;siteNumber=${site},limit=${pageSize},offset=${page * pageSize},sortBy=POSTING_DATES_DESC${keywordPart}`
      const res = await fetchWithRetry(
        `https://${host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=${finder}`,
      )
      if (!res.ok) {
        if (byId.size === 0 && page === 0) throw new Error(`Oracle ${host}/${site}: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const data = await res.json()
      const list = data?.items?.[0]?.requisitionList ?? []
      for (const r of list) byId.set(r.Id, r)
      if (list.length < pageSize) break
      if (page === maxPages - 1) coverageComplete = false
    }
  }
  const applyUrl = (id) => `https://${host}/hcmUI/CandidateExperience/en/sites/${site}/job/${id}`
  const jobs = [...byId.values()].map((r) => ({
    sourceJobId: String(r.Id),
    title: (r.Title ?? '').trim(),
    location: r.PrimaryLocation ?? '',
    structuredCountry: r.PrimaryLocationCountry === 'US' ? 'United States' : null,
    applyUrl: applyUrl(r.Id),
    sourceUrl: applyUrl(r.Id),
    description: [r.ShortDescriptionStr, r.JobFamily, r.JobFunction].filter(Boolean).join('\n'),
    postedAt: r.PostedDate ? new Date(`${r.PostedDate}T12:00:00Z`).toISOString() : null,
    postedAtProvenance: r.PostedDate ? 'employer_posted_date' : 'unavailable',
    sourceUpdatedAt: null,
    department: r.JobFamily ?? '',
  }))
  return { jobs, coverageComplete }
}
