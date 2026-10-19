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
- **Resume** — upload a PDF/DOCX resume (extracted entirely in your
  browser via pdf.js/mammoth — nothing is uploaded anywhere for this
  step), review/correct it into a structured master resume, then pick a
  tracked job and tailor: real gap analysis (matched/missing skills with
  quoted evidence, no fabrication), optional AI bullet-rewrite
  suggestions (needs a deployed backend — see below), a diff-based
  accept/reject review, and export to a real searchable-text PDF, an
  editable DOCX, plain text, or a JSON backup. All resume data lives only
  in this browser's IndexedDB — never in the public dataset, never
  committed to git. See [Resume workflow architecture](#resume-workflow-architecture).
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

## Resume workflow architecture

What runs where, so it's explicit:

- **In your browser, always (no backend needed):** PDF text extraction
  (`pdfjs-dist`, including a two-column-aware reading-order reconstructor
  — see `src/lib/resume/pdfReadingOrder.js`), DOCX extraction (`mammoth`),
  OCR fallback for scanned PDFs (`tesseract.js`, only runs on your
  explicit click), the structured section parser, the local truthful gap
  analysis (`src/lib/resume/tailoring.js`'s `compareResumeToJob` —
  matched/missing skills with quoted evidence, required-vs-preferred
  clause splitting, experience-relevance reordering), the diff review UI,
  and PDF/DOCX/text/JSON export (`pdf-lib`, `docx`). None of this touches
  a network request.
- **Requires a backend you deploy yourself:** AI-generated bullet rewrite
  *suggestions* specifically (not the gap analysis, which is always
  local). `server/analyze-resume/worker.js`'s `/tailor` route is real,
  deployable code with a strict truthfulness system prompt (never invents
  metrics, never swaps technology names, never invents employment/dates),
  input validation, per-IP rate limiting via Cloudflare KV, and no
  resume-content logging — but it is **not deployed**. Without
  `VITE_RESUME_TAILOR_API_URL` set at build time, the Tailor panel shows
  an honest "AI setup required" state and only the local analysis runs.
- **Storage:** IndexedDB, this browser only (`src/lib/resume/storage.js`)
  — your master resume, tailored versions, and their job associations.
  This does **not** sync across devices or browsers. Use "Export backup
  (JSON)" / "Import backup" in the Resume tab to move data manually, and
  export one periodically — clearing site data loses everything with no
  recovery.
- **Cost:** the AI backend, if you deploy it, costs whatever Cloudflare
  Workers (free tier is generous) and Anthropic API usage (pay-per-token)
  you actually incur. Nothing here provisions or spends on your behalf.

## Instant alerts for top-company roles

The site lists everything; **alerts** are deliberately narrow. A role triggers one only if it is at a
company in `scripts/bigCompanies.mjs`, is open and full-time, is a software or tech-ops role we are confident
about, and has a real early-career signal (new-grad / rotational posting, or an entry-level *title*). Edit
that file to change the company list.

**Live-watched today (26):** Amazon, Apple, JPMorgan Chase, NVIDIA, Adobe, Intel, Cisco, Mastercard, Capital One,
Barclays, Stripe, Airbnb, Coinbase, Databricks, Snowflake, OpenAI, Anthropic, Palantir, Jane Street, Jump Trading,
IMC, DRW, Point72, Virtu, Akuna, Waymo.

**Cannot be watched (no public feed we could verify):** Google, Meta, Microsoft, Citadel, Citadel Securities,
Goldman Sachs, Morgan Stanley, Bank of America, Citigroup, Two Sigma, Hudson River Trading, D. E. Shaw, Netflix,
Tesla, Salesforce, and others in the Directory. They are listed with a link so you can check manually; no alert can
fire for them. (Salesforce and Microsoft returned rate-limit errors during verification, so they are unconfirmed
rather than impossible.)

### Setup (one time)

1. **Email:** create a free [Resend](https://resend.com) API key. Add repo secrets `RESEND_API_KEY` and
   `ALERT_EMAIL_TO`. (Without a verified domain Resend only delivers to the account owner's address, which is fine
   for personal use.)
2. **Phone push (optional, no account):** install the ntfy app, subscribe to a long random topic, add it as the
   `NTFY_TOPIC` secret. Tapping the notification opens the apply page.
3. Repo → Settings → Secrets and variables → Actions → New repository secret.

### How fast is "instant"?

| Path | Cadence | Needs |
| --- | --- | --- |
| `.github/workflows/watch.yml` | scheduled every 5 min, best-effort (GitHub often delays schedules) | the secrets above |
| `server/job-alerts/` (Cloudflare Worker) | every 1 min | your Cloudflare account, a KV namespace, the same secrets; likely the Workers paid plan (CPU limit) |

Neither can beat the employer: a role is only visible once the company's own feed lists it. The first poll of a
company records its current postings silently, so you are not flooded when a company is added. If every configured
channel fails to deliver, the role is **not** marked seen and is retried on the next poll, and the run turns red.

Dry-run locally with no secrets: `node scripts/watch.mjs --dry`.

## Getting started

```bash
npm install
npm run collect   # runs the real collector against live ATS/Workday APIs
npm run dev
```

## Testing

```bash
npm test    # vitest — collection, eligibility, geography, CSV safety, migration,
            # resume parsing/diff/tailoring/PDF export (see tests/resume*.test.js)
npm run lint
npm run build
```

## Known limitations (read before assuming full coverage)

- Live adapters exist for Greenhouse, Lever, Ashby, and Workday (CXS API,
  including full pagination and per-job detail fetching so descriptions
  are available for classification). Workday tenants were found via web
  research and individually verified with a real request — not guessed.
  SmartRecruiters/Workable adapter code exists in git history from an
  earlier investigation but wasn't wired in — no employer in the
  directory had live postings on either after real testing.
- Large employers still on Workday/a custom ATS but not yet
  individually verified remain "Manual verification needed" in the
  Directory with their careers URL, not a live feed. Those URLs are from
  general knowledge, not a live fetch — verify before relying on one.
- "Possibly eligible — review requirements" is a real, large category:
  most ATS list endpoints don't expose enough text to confidently say a
  role is new-grad-eligible or not. It's shown, not hidden, and labeled
  honestly rather than guessed either way.
- The resume section parser is heuristic: it handles common one- and
  two-column layouts and standard section headings well, but unusual
  formats may extract imperfectly. Extraction confidence and specific
  warnings are always shown, and the raw extracted text stays available
  for you to check against the original.
- OCR (scanned PDFs) is a real local fallback via `tesseract.js`, but is
  slower and less accurate than text extraction — it's offered, not run
  automatically, and its confidence score is shown.
- The AI bullet-rewrite backend is real, deployable code that is **not
  deployed**. Without `VITE_RESUME_TAILOR_API_URL` set at build time, the
  Tailor panel always uses the local, non-AI gap analysis and says so.
