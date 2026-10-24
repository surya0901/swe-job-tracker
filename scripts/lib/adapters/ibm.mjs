import { fetchWithRetry } from '../fetchWithRetry.mjs'

// IBM Careers' search API (the call careers/search makes). Verified live
// (1,093 hits at verification time). IBM's own country and experience-level
// tags are carried through so the classifier and the US filter see the
// employer's values. No posting date is published in this feed.
const ENDPOINT = 'https://www-api.ibm.com/search/api/v2'
const PAGE_SIZE = 30
const SOURCE = [
  'title',
  'url',
  'description',
  'field_keyword_05',
  'field_keyword_08',
  'field_keyword_17',
  'field_keyword_18',
  'field_text_01',
]

function body(query, from) {
  return {
    appId: 'careers',
    scopes: ['careers2'],
    query: { bool: { must: [{ simple_query_string: { query, fields: ['keywords^1', 'body^1', 'url^2', 'description^2', 'title^3'] } }] } },
    size: PAGE_SIZE,
    from,
    sort: [{ _score: 'desc' }, { pageviews: 'desc' }],
    lang: 'zz',
    localeSelector: {},
    sm: { query, lang: 'zz' },
    _source: SOURCE,
  }
}

export async function fetchIbmJobs({ queries = ['software engineer'], maxPages = 4 } = {}) {
  const byId = new Map()
  let coverageComplete = true
  for (const query of queries) {
    for (let page = 0; page < maxPages; page++) {
      const res = await fetchWithRetry(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Referer: 'https://www.ibm.com/careers/search' },
        body: JSON.stringify(body(query, page * PAGE_SIZE)),
      })
      if (!res.ok) {
        if (byId.size === 0 && page === 0) throw new Error(`IBM careers search: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const hits = (await res.json())?.hits?.hits ?? []
      const before = byId.size
      for (const h of hits) byId.set(h._source?.field_text_01 ?? h._id, h._source ?? {})
      if (hits.length < PAGE_SIZE || byId.size === before) break
      if (page === maxPages - 1) coverageComplete = false
    }
  }
  const jobs = [...byId.entries()]
    .filter(([, s]) => s.field_keyword_05 === 'United States')
    .map(([id, s]) => {
      const level = s.field_keyword_18 && s.field_keyword_18 !== 'None' ? s.field_keyword_18 : 'not stated'
      const arrangement = s.field_keyword_17 && s.field_keyword_17 !== 'None' ? s.field_keyword_17 : 'not stated'
      return {
        sourceJobId: String(id),
        title: (s.title ?? '').trim(),
        location: 'United States',
        structuredCountry: 'United States',
        applyUrl: s.url,
        sourceUrl: s.url,
        description: [`Experience level: ${level} (as tagged by IBM).`, `Work arrangement: ${arrangement}.`, s.description ?? '']
          .filter(Boolean)
          .join('\n'),
        postedAt: null,
        postedAtProvenance: 'unavailable',
        sourceUpdatedAt: null,
        department: s.field_keyword_08 && s.field_keyword_08 !== 'None' ? s.field_keyword_08 : '',
      }
    })
  return { jobs, coverageComplete }
}
