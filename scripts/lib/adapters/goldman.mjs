import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Goldman Sachs' careers search GraphQL (the call higher.gs.com makes).
// Verified live (692 roles at verification time). Goldman tags each role
// with its own experience level; that tag is carried into the description
// so the classifier reads the employer's wording, not a guess.
const ENDPOINT = 'https://api-higher.gs.com/gateway/api/v1/graphql'
const QUERY =
  'query GetRoles($searchQueryInput: RoleSearchQueryInput!) { roleSearch(searchQueryInput: $searchQueryInput) { totalCount items { roleId jobTitle jobFunction locations { city state country } } } }'

export async function fetchGoldmanJobs({ searchTerms = ['engineer'], pageSize = 50, maxPages = 3 } = {}) {
  const byId = new Map()
  let coverageComplete = true
  for (const searchTerm of searchTerms) {
    for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
      const res = await fetchWithRetry(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            searchQueryInput: {
              page: { pageSize, pageNumber },
              sort: { sortStrategy: 'POSTED_DATE', sortOrder: 'DESC' },
              filters: [],
              experiences: ['PROFESSIONAL', 'EARLY_CAREER'],
              searchTerm,
            },
          },
        }),
      })
      if (!res.ok) {
        if (byId.size === 0 && pageNumber === 0) throw new Error(`Goldman Sachs: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const data = await res.json()
      const items = data?.data?.roleSearch?.items ?? []
      for (const item of items) byId.set(item.roleId, item)
      if (items.length < pageSize) break
      if (pageNumber === maxPages - 1) coverageComplete = false
    }
  }
  const jobs = [...byId.values()].map((item) => {
    const locs = (item.locations ?? []).map((l) => [l.city, l.state, l.country].filter(Boolean).join(', ')).filter(Boolean)
    const earlyCareer = /_EARLY_CAREER$/.test(item.roleId)
    return {
      sourceJobId: item.roleId,
      title: (item.jobTitle ?? '').trim(),
      location: locs.join('; '),
      structuredCountry: (item.locations ?? [])[0]?.country === 'United States' ? 'United States' : null,
      applyUrl: `https://higher.gs.com/roles/${item.roleId}`,
      sourceUrl: `https://higher.gs.com/roles/${item.roleId}`,
      description: [
        earlyCareer ? 'Experience level: Early career (as tagged by Goldman Sachs).' : 'Experience level: Professional (as tagged by Goldman Sachs).',
        item.jobFunction ? `Function: ${item.jobFunction}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
      postedAt: null,
      postedAtProvenance: 'unavailable',
      sourceUpdatedAt: null,
      department: item.jobFunction ?? '',
    }
  })
  return { jobs, coverageComplete }
}
