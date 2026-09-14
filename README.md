# SWE New Grad & Rotational Program Tracker

A dashboard for tracking applications to software engineering new-grad and
rotational programs (TDPs, LDPs) — Kanban + table views, per-company
interview prep links, a resume-vs-job-description assistant, CSV export,
and localStorage persistence. Built with React, Vite, and Tailwind CSS.

## Features

- **Kanban / table tracker** — drag companies between To Apply, Applied,
  OA, Interview, Offer, and Rejected, or manage the same data as a
  filterable table (industry, program type, status, search).
- **Company Prep Hub** — click a company to open a drawer with constructed
  links to [perixtar/Tech-OA-Interview-Questions](https://github.com/perixtar/Tech-OA-Interview-Questions)
  (GitHub code search scoped to that company), Glassdoor interview
  reviews, and the company's LeetCode tag page, plus a notes field.
- **Resume Assistant** — paste a job description and resume to see missing
  keywords, suggested bullet rewrites, and a "reality check" of gaps.
  Currently backed by mock data in [`src/lib/mockResumeAnalysis.js`](src/lib/mockResumeAnalysis.js)
  — swap in a real LLM API route to make it live.
- **Refresh Openings** — simulates fetching new postings with a loading
  state. See [`src/lib/refreshOpenings.js`](src/lib/refreshOpenings.js) for
  where to plug in a real backend or scraper.
- **Persistence & export** — all data is saved to `localStorage`; use
  Export CSV to download your tracker as a spreadsheet.

## Getting started

```bash
npm install
npm run dev
```

## Wiring up real data

- **Job openings**: replace the body of `fetchNewOpenings()` in
  `src/lib/refreshOpenings.js` with a real `fetch()` call to your own API
  or scraper backend (scraping can't run client-side due to CORS).
- **Resume analysis**: replace `analyzeResume()` in
  `src/lib/mockResumeAnalysis.js` with a call to a server route that hits
  an LLM API (never call an LLM API directly from the browser with an
  embedded key).
- **Seed companies**: edit `src/data/seedCompanies.js` with your own
  target list.
