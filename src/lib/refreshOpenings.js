// Simulated "Refresh Openings" call.
//
// TO WIRE UP A REAL BACKEND:
//   1. Replace the body of fetchNewOpenings() with a real fetch(), e.g.
//        const res = await fetch('/api/openings')
//        if (!res.ok) throw new Error('Failed to fetch openings')
//        return await res.json()
//   2. Your API (or scraper) should return a JSON array of objects shaped
//      like src/data/seedCompanies.js entries: { name, programName,
//      industry, programType, location, url, ... }. `id`, `status`,
//      `notes`, and `dateAdded` are filled in client-side if missing.
//   3. A scraper (Playwright/Cheerio/etc.) can't run in the browser due to
//      CORS/CSP — run it server-side (a small Node/Express route, a
//      Cloudflare Worker, a cron job writing to a DB) and have this
//      function call that endpoint instead.

const MOCK_NEW_OPENINGS = [
  {
    name: 'Stripe',
    programName: 'Software Engineer, New Grad',
    industry: 'Fintech',
    programType: 'Standard',
    location: 'San Francisco, CA',
    url: 'https://stripe.com/jobs',
  },
  {
    name: 'Boeing',
    programName: 'Engineering Rotation Program',
    industry: 'Aerospace/Defense',
    programType: 'Rotational',
    location: 'Seattle, WA',
    url: 'https://jobs.boeing.com',
  },
  {
    name: 'Honeywell',
    programName: 'Technology Leadership Program',
    industry: 'Industrial',
    programType: 'Rotational',
    location: 'Charlotte, NC',
    url: 'https://careers.honeywell.com',
  },
]

const SIMULATED_LATENCY_MS = 1100

export function fetchNewOpenings() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(MOCK_NEW_OPENINGS), SIMULATED_LATENCY_MS)
  })
}
