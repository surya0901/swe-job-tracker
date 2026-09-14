# SWE New Grad & Rotational Program Tracker

A dashboard for tracking applications to software engineering new-grad and
rotational programs (TDPs, LDPs). Real job postings are collected from
live employer ATS APIs on a schedule and published as static JSON that the
site reads — see [Architecture](#architecture) below for exactly what's
real versus what still needs manual work.

## Features

- **Openings** — a searchable, sortable, paginated table of real, currently
  open postings collected from Greenhouse/Lever/Ashby/Workday, filterable
  by industry, program type, eligibility category, country (defaults to
  US), posted-date recency, and availability. Shows Posted and First
  Found dates on every row.
- **Directory** — every researched company, each labeled Connected /
  Manual verification needed / Source temporarily failing, with a link to
  its careers page or live source.
- **Tracker** — Kanban or table view of jobs you've actually added, with
  drag-and-drop status changes, notes, and interview-prep links. Starts
  empty with a "Browse openings" prompt rather than dumping the whole
  catalog on you.
- **Resume Assistant** — a real, local (non-AI) keyword comparison between
  your pasted resume and job description — every "missing keyword" and
  every "matched" claim is grounded in the literal text you pasted, never
  fabricated. A real server-side AI backend is implemented in
  `server/analyze-resume/` but requires you to deploy it with your own
  Cloudflare account and API key (see that folder's README comments).
- **Company Prep Hub** — per-job drawer with constructed links to
  [perixtar/Tech-OA-Interview-Questions](https://github.com/perixtar/Tech-OA-Interview-Questions),
  Glassdoor, and LeetCode's company tag page, plus full date provenance
  (posted, source-updated, first found, last seen, last checked, deadline)
  and the eligibility category with its evidence.
- **CSV export** (formula-injection safe), **localStorage persistence**
  (personal application progress only — never the job catalog itself, so
  catalog updates always show up), and safe migration from the old v1
  data format.

## Architecture

```
scripts/collect.mjs      — real collector: calls live Greenhouse/Lever/
                            Ashby/Workday APIs, classifies eligibility
                            (title + description, required-vs-preferred
                            experience), reconciles against the previous
                            dataset, writes public/data/*.json
scripts/lib/eligibility.mjs — documented eligibility classifier: explicit
                            new grad / entry level / rotational-TDP /
                            possibly eligible / excluded, each with
                            evidence text
scripts/lib/geography.mjs   — heuristic country + remote/hybrid/onsite
                            normalization from free-text locations
scripts/lib/adapters/       — greenhouse.mjs, lever.mjs, ashby.mjs (public
                            JSON APIs) and workday.mjs (the CXS endpoint a
                            company's own careers page calls — no public
                            docs, so every tenant in scripts/companies.mjs
                            was individually verified with a real request
                            this session, not guessed)
public/data/              — published dataset the site fetches at runtime
                            (companies.json, jobs.json, collection-meta.json)
.github/workflows/        — runs the collector every ~6h (and on push/
  deploy.yml               manual dispatch), commits the data, builds, and
                            deploys to GitHub Pages in one workflow run —
                            every run commits, not just scheduled ones, so
                            reconciliation history survives push-triggered
                            deploys too (paths-ignore on the push trigger
                            prevents that commit from looping the workflow)
src/lib/catalog.js        — client fetch of the published dataset (cache-busted)
src/lib/userData.js       — personal application data only (localStorage),
                            separate from the catalog, with v1 migration
server/analyze-resume/    — deployable Cloudflare Worker for a real AI
                            backend (not deployed by default — needs your
                            own account)
```

## Getting started

```bash
npm install
npm run collect   # runs the real collector against live ATS/Workday APIs
npm run dev
```

## Testing

```bash
npm test    # vitest — reconciliation, eligibility, geography, CSV safety, migration
npm run lint
npm run build
```

## Known limitations (read before assuming full coverage)

- Live adapters exist for Greenhouse, Lever, Ashby, and Workday (CXS API).
  Workday tenants were found via web research and individually verified
  with a real request — not guessed — but Workday's list endpoint doesn't
  expose full descriptions, so those postings are classified on title
  only. SmartRecruiters/Workable adapter code exists in git history from
  this investigation but wasn't wired in — no employer in the directory
  had live postings on either after real testing.
- Large employers still on Workday/a custom ATS but not yet
  individually verified remain "Manual verification needed" in the
  Directory with their careers URL, not a live feed. Those URLs are from
  general knowledge, not a live fetch — verify before relying on one.
- "Possibly eligible — review requirements" is a real, large category:
  most ATS list endpoints don't expose enough text to confidently say a
  role is new-grad-eligible or not. It's shown, not hidden, and labeled
  honestly rather than guessed either way.
- The AI resume backend is real, deployable code that is **not deployed**.
  Without `VITE_RESUME_API_URL` set at build time, the app always uses the
  local non-AI comparison and says so in the UI.
