# SWE New Grad & Rotational Program Tracker

A dashboard for tracking applications to software engineering new-grad and
rotational programs (TDPs, LDPs). Real job postings are collected from
live employer ATS APIs on a schedule and published as static JSON that the
site reads — see [Architecture](#architecture) below for exactly what's
real versus what still needs manual work.

## Features

- **Openings** — a searchable, sortable, paginated table of real, currently
  open postings collected from Greenhouse/Lever/Ashby, filterable by
  industry, program type, location, and availability.
- **Directory** — every researched company (250+ target, see honest counts
  below), each labeled Connected / Manual verification needed / Source
  temporarily failing, with a link to its careers page or live source.
- **Tracker** — Kanban or table view of jobs you've actually added, with
  drag-and-drop status changes, notes, and interview-prep links.
- **Resume Assistant** — a real, local (non-AI) keyword comparison between
  your pasted resume and job description — every "missing keyword" and
  every "matched" claim is grounded in the literal text you pasted, never
  fabricated. A real server-side AI backend is implemented in
  `server/analyze-resume/` but requires you to deploy it with your own
  Cloudflare account and API key (see that folder's README comments).
- **Company Prep Hub** — per-job drawer with constructed links to
  [perixtar/Tech-OA-Interview-Questions](https://github.com/perixtar/Tech-OA-Interview-Questions),
  Glassdoor, and LeetCode's company tag page.
- **CSV export**, **localStorage persistence** (personal application
  progress only — never the job catalog itself, so catalog updates always
  show up), and safe migration from the old v1 data format.

## Architecture

```
scripts/collect.mjs   — real collector: calls live Greenhouse/Lever/Ashby
                         APIs, filters to new-grad/rotational SWE roles,
                         reconciles against the previous dataset, writes
                         public/data/*.json
public/data/           — published dataset the site fetches at runtime
                         (companies.json, jobs.json, collection-meta.json)
.github/workflows/     — runs the collector every ~6h (and on push/manual
  deploy.yml             dispatch), commits the data, builds, and deploys
                         to GitHub Pages — all in one workflow run, so
                         deployment never depends on a bot commit
                         triggering a second workflow
src/lib/catalog.js     — client fetch of the published dataset (cache-busted)
src/lib/userData.js    — personal application data only (localStorage),
                         separate from the catalog, with v1 migration
server/analyze-resume/ — deployable Cloudflare Worker for a real AI backend
                         (not deployed by default — needs your own account)
```

## Getting started

```bash
npm install
npm run collect   # runs the real collector against live ATS APIs
npm run dev
```

## Testing

```bash
npm test    # vitest — collector reconciliation, filters, migration, resume analysis
npm run lint
npm run build
```

## Known limitations (read before assuming full coverage)

- Only Greenhouse, Lever, and Ashby are implemented as live adapters.
  These are mostly used by tech/startup companies. Large traditional
  employers with well-known TDP/LDP programs (banks, insurers,
  industrials, aerospace, etc.) mostly run Workday or a custom ATS and are
  listed in the Directory as "Manual verification needed" with their
  careers URL, not a live feed.
- The company directory's `careersUrl` values for those manual-only
  companies come from general knowledge of well-known corporate domains,
  not a live fetch — verify before relying on one.
- The AI resume backend is real, deployable code that is **not deployed**.
  Without `VITE_RESUME_API_URL` set at build time, the app always uses the
  local non-AI comparison and says so in the UI.
