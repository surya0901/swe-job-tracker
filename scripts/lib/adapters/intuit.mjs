import { fetchWithRetry } from '../fetchWithRetry.mjs'

// Intuit's careers search page (Radancy-hosted). Results are server-rendered
// into <li> items carrying the job id, category and title; pagination is the
// `p` query parameter. Verified live (614 jobs at verification time).
const SEARCH = 'https://jobs.intuit.com/search-jobs'

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
}

function parseItems(html) {
  const items = []
  for (const block of html.match(/<li data-remote[\s\S]*?<\/li>/g) ?? []) {
    const id = block.match(/data-intuit-jobid="([^"]+)"/)?.[1]
    const title = decode(block.match(/data-title="([^"]*)"/)?.[1] ?? '').trim()
    const href = block.match(/<a href="(\/job\/[^"]+)"/)?.[1]
    const category = decode(block.match(/data-category='([^']*)'/)?.[1] ?? '')
    if (!id || !title || !href) continue
    const tokens = block
      .replace(/<[^>]+>/g, '\n')
      .split('\n')
      .map((t) => decode(t).trim())
      .filter(Boolean)
    const titleAt = tokens.indexOf(title)
    const location = titleAt >= 0 ? tokens.slice(titleAt + 1).find((t) => t !== 'Save' && t.length > 1) ?? '' : ''
    items.push({ id, title, href, category, location })
  }
  return items
}

export async function fetchIntuitJobs({ keywords = ['software engineer', 'technology'], maxPages = 3 } = {}) {
  const byId = new Map()
  let coverageComplete = true
  for (const keywordValue of keywords) {
    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({ keywords: keywordValue, location: 'United States', p: String(page) })
      const res = await fetchWithRetry(`${SEARCH}?${params}`, { headers: { Accept: 'text/html' } })
      if (!res.ok) {
        if (byId.size === 0 && page === 1) throw new Error(`Intuit careers search: HTTP ${res.status}`)
        coverageComplete = false
        break
      }
      const items = parseItems(await res.text())
      const before = byId.size
      for (const it of items) byId.set(it.id, it)
      if (items.length === 0 || byId.size === before) break
      if (page === maxPages) coverageComplete = false
    }
  }
  const jobs = [...byId.values()].map((it) => {
    const url = `https://jobs.intuit.com${it.href}`
    return {
      sourceJobId: it.id,
      title: it.title,
      location: it.location,
      structuredCountry: /united states|, (CA|NY|WA|CO|TX|NC|AZ|IL|MA|GA|FL|UT|OR)\b/i.test(it.location) ? 'United States' : null,
      applyUrl: url,
      sourceUrl: url,
      description: it.category ? `Category: ${it.category}` : '',
      postedAt: null,
      postedAtProvenance: 'unavailable',
      sourceUpdatedAt: null,
      department: it.category,
    }
  })
  return { jobs, coverageComplete }
}
