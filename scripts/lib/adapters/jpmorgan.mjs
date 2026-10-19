import { fetchWithRetry } from '../fetchWithRetry.mjs'

// JPMorgan Chase careers run on Oracle Recruiting Cloud; its public
// candidate-experience REST endpoint is what jpmorganchase.com/careers
// calls. Verified live (1,579 requisitions at verification time), sorted
// by posting date, with a real PostedDate. The list carries title,
// location, family and worker type but not the full description.
const BASE = 'https://jpmc.fa.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions'
const SITE = 'CX_1001'
const PAGE = 50

export async function fetchJpmorganJobs({ keywords = ['software engineer', 'software engineer program', 'technology analyst', 'technology operations'], maxPages = 2 } = {}) {
  const byId = new Map()
  let coverageComplete = true
  for (const keyword of keywords) {
    for (let page = 0; page < maxPages; page++) {
      const finder = `findReqs;siteNumber=${SITE},limit=${PAGE},offset=${page * PAGE},sortBy=POSTING_DATES_DESC,keyword=${encodeURIComponent(keyword)}`
      const res = await fetchWithRetry(`${BASE}?onlyData=true&expand=requisitionList.secondaryLocations&finder=${finder}`)
      if (!res.ok) {
        if (byId.size === 0 && page === 0) throw new Error(`JPMorgan: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const data = await res.json()
      const list = data?.items?.[0]?.requisitionList ?? []
      for (const r of list) byId.set(r.Id, r)
      if (list.length < PAGE) break
      if (page === maxPages - 1) coverageComplete = false
    }
  }
  const jobs = [...byId.values()]
    .filter((r) => !r.ContractType || /regular|full/i.test(r.ContractType) || r.ContractType === 'Regular')
    .map((r) => ({
      sourceJobId: String(r.Id),
      title: (r.Title ?? '').trim(),
      location: r.PrimaryLocation ?? '',
      structuredCountry: r.PrimaryLocationCountry === 'US' ? 'United States' : null,
      applyUrl: `https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/${SITE}/job/${r.Id}`,
      sourceUrl: `https://jpmc.fa.oraclecloud.com/hcmUI/CandidateExperience/en/sites/${SITE}/job/${r.Id}`,
      description: [r.ShortDescriptionStr, r.JobFamily, r.JobFunction].filter(Boolean).join('\n'),
      postedAt: r.PostedDate ? new Date(`${r.PostedDate}T12:00:00Z`).toISOString() : null,
      postedAtProvenance: r.PostedDate ? 'employer_posted_date' : 'unavailable',
      sourceUpdatedAt: null,
      department: r.JobFamily ?? '',
    }))
  return { jobs, coverageComplete }
}
