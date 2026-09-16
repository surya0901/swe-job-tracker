#!/usr/bin/env node
// Real job collector. Run by GitHub Actions on a schedule (and manually via
// workflow_dispatch), and runnable locally with `node scripts/collect.mjs`.
//
// Reads scripts/companies.mjs (the researched company directory), calls the
// real Greenhouse/Lever/Ashby public APIs for candidate companies, filters
// to new-grad/rotational software roles, reconciles against the previously
// published dataset (so a posting isn't marked closed just because one
// fetch missed it), and writes public/data/{companies,jobs,collection-meta}.json.
//
// If a run fails badly (a source outage, network issue), the previously
// published jobs.json is left in place — see `shouldKeepPreviousDataset`.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { atsCandidateCompanies, workdayCandidateCompanies, manualCompanies } from './companies.mjs'
import { fetchGreenhouseJobs } from './lib/adapters/greenhouse.mjs'
import { fetchLeverJobs } from './lib/adapters/lever.mjs'
import { fetchAshbyJobs } from './lib/adapters/ashby.mjs'
import { fetchWorkdayJobs } from './lib/adapters/workday.mjs'
import { mapWithConcurrency } from './lib/fetchWithRetry.mjs'
import { normalizeJob, reconcileJobs, shouldKeepPreviousDataset as computeShouldKeep } from './lib/reconcile.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'public', 'data')
const CONCURRENCY = 6

const ADAPTERS = {
  greenhouse: (source) => fetchGreenhouseJobs(source.token),
  lever: (source) => fetchLeverJobs(source.token),
  ashby: (source) => fetchAshbyJobs(source.token),
  workday: (source) => fetchWorkdayJobs(source),
}

// A source's stable identity component for job-id construction: the ATS
// board token, or the Workday tenant.
function sourceKey(source) {
  return source.token ?? source.tenant
}

const allCandidateCompanies = [...atsCandidateCompanies, ...workdayCandidateCompanies]

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function readJsonIfExists(filePath, fallback) {
  try {
    const raw = await readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function collectFromCandidate(company) {
  const [name, industry, candidates] = company
  const companyId = slugify(name)
  const attempts = []

  for (const candidate of candidates) {
    const fetcher = ADAPTERS[candidate.adapter]
    try {
      const { jobs: rawJobs, coverageComplete, ...coverageStats } = await fetcher(candidate)
      attempts.push({ ...candidate, ok: true })
      return {
        companyId,
        name,
        industry,
        status: 'connected',
        source: candidate,
        attempts,
        rawJobs,
        coverageComplete,
        coverageStats,
        error: null,
      }
    } catch (err) {
      attempts.push({ ...candidate, ok: false, error: String(err.message ?? err) })
    }
  }

  return {
    companyId,
    name,
    industry,
    status: 'source_failing',
    source: null,
    attempts,
    rawJobs: [],
    error: attempts.map((a) => `${a.adapter}:${sourceKey(a)} -> ${a.error}`).join('; '),
  }
}

// Distinguishes *why* a source failed so the Directory can show something
// more useful than a generic "failing" badge — a 404 (wrong guessed
// token) is a very different fix from a 429 (we're being rate limited
// and should just back off) or a 5xx (their service is down).
function categorizeFailure(errorText) {
  if (!errorText) return 'unknown'
  if (/ERR_TENANT_MIGRATED/.test(errorText)) return 'platform_migrated'
  if (/HTTP 404/.test(errorText)) return 'not_found'
  if (/HTTP 410/.test(errorText)) return 'platform_migrated'
  if (/HTTP 429/.test(errorText)) return 'rate_limited'
  if (/HTTP 5\d\d/.test(errorText)) return 'temporarily_unavailable'
  if (/abort|timeout/i.test(errorText)) return 'timeout'
  return 'unknown'
}

function buildManualCompanyRecord([name, industry, careersUrl, programName]) {
  return {
    companyId: slugify(name),
    name,
    industry,
    status: 'manual_verification_needed',
    careersUrl,
    programName,
    source: null,
    error: null,
  }
}

async function main() {
  const startedAt = new Date().toISOString()
  const nowIso = startedAt

  const previousJobs = await readJsonIfExists(path.join(DATA_DIR, 'jobs.json'), [])
  const previousMeta = await readJsonIfExists(path.join(DATA_DIR, 'collection-meta.json'), {
    history: [],
  })
  const previousById = new Map(previousJobs.map((j) => [j.id, j]))

  const results = await mapWithConcurrency(allCandidateCompanies, CONCURRENCY, collectFromCandidate)

  const connected = results.filter((r) => r.status === 'connected')
  const failing = results.filter((r) => r.status === 'source_failing')

  const freshJobs = []

  for (const result of connected) {
    for (const raw of result.rawJobs) {
      if (!raw.title) continue
      // Eligibility (title + description, required-vs-preferred years,
      // program classification) decides inclusion — see
      // scripts/lib/eligibility.mjs. Only a hard exclusion (non-software
      // title, internship/co-op, seniority signal, 3+ required years)
      // drops a posting; everything else is published with its category
      // and evidence so the UI can show why.
      const job = normalizeJob({
        company: result,
        source: result.source,
        raw,
        nowIso,
        previousById,
      })
      if (job.eligibility === 'excluded') continue
      freshJobs.push(job)
    }
  }

  // Reconcile: for companies whose source succeeded this run, any
  // previously-open job not seen again gets a miss counted rather than
  // being deleted outright — only closed after 3 consecutive clean misses.
  // Companies whose source failed this run are left entirely untouched
  // (we never close a job because a *request* failed).
  // Only companies whose source coverage was COMPLETE this run are
  // eligible to close a previously-seen posting that didn't reappear — a
  // company we only partially checked (hit a pagination/detail cap, or a
  // later page failed) must not have its unseen-but-real postings marked
  // closed just because we didn't look far enough this run.
  const fullyCoveredCompanyIds = new Set(connected.filter((r) => r.coverageComplete !== false).map((r) => r.companyId))
  const reconciled = reconcileJobs({ freshJobs, previousJobs, succeededCompanyIds: fullyCoveredCompanyIds, nowIso })

  const openJobCount = reconciled.filter((j) => j.status === 'open').length
  const previousOpenCount = previousJobs.filter((j) => j.status === 'open').length

  // Guardrail: if every single source failed, or open postings collapsed
  // to near-zero from a healthy previous run, don't publish — keep the
  // last good dataset and just record the failure in history.
  const allSourcesFailed = connected.length === 0 && allCandidateCompanies.length > 0
  const shouldKeepPreviousDataset = computeShouldKeep({
    connectedCount: connected.length,
    attemptedCount: allCandidateCompanies.length,
    previousOpenCount,
    freshOpenCount: openJobCount,
  })

  const finalJobs = shouldKeepPreviousDataset ? previousJobs : reconciled

  const manualRecords = manualCompanies.map(buildManualCompanyRecord)
  const connectedRecords = connected.map((r) => ({
    companyId: r.companyId,
    name: r.name,
    industry: r.industry,
    status: r.status,
    source: r.source,
    careersUrl: null,
    programName: null,
    coverageComplete: r.coverageComplete !== false,
    coverageStats: r.coverageStats ?? null,
  }))
  const failingRecords = failing.map((r) => ({
    companyId: r.companyId,
    name: r.name,
    industry: r.industry,
    status: r.status,
    source: null,
    careersUrl: null,
    programName: null,
    error: r.error,
    failureCategory: categorizeFailure(r.error),
  }))

  const companies = [...connectedRecords, ...failingRecords, ...manualRecords]

  const finishedAt = new Date().toISOString()
  const runSummary = {
    startedAt,
    finishedAt,
    published: !shouldKeepPreviousDataset,
    skippedReason: shouldKeepPreviousDataset
      ? allSourcesFailed
        ? 'all_sources_failed'
        : 'catastrophic_drop_guardrail'
      : null,
    companiesAttempted: allCandidateCompanies.length,
    companiesConnected: connected.length,
    companiesFailing: failing.length,
    manualCompanies: manualCompanies.length,
    openJobsThisRun: openJobCount,
    sources: results.map((r) => ({
      companyId: r.companyId,
      name: r.name,
      status: r.status,
      attempts: r.attempts,
      error: r.error,
    })),
  }

  const history = [runSummary, ...(previousMeta.history ?? [])].slice(0, 100)

  const meta = {
    lastRunAt: finishedAt,
    lastSuccessAt: shouldKeepPreviousDataset ? (previousMeta.lastSuccessAt ?? null) : finishedAt,
    lastRunPublished: !shouldKeepPreviousDataset,
    counts: {
      totalCompanies: companies.length,
      connectedCompanies: connected.length,
      fullyCheckedCompanies: connectedRecords.filter((c) => c.coverageComplete).length,
      partiallyCheckedCompanies: connectedRecords.filter((c) => !c.coverageComplete).length,
      manualCompanies: manualCompanies.length,
      failingCompanies: failing.length,
      // "Open" = the posting itself is live per its source. Eligibility
      // (below) is a separate axis — an open posting can still be an
      // uncertain or excluded match.
      openJobs: finalJobs.filter((j) => j.status === 'open').length,
      closedJobs: finalJobs.filter((j) => j.status === 'closed').length,
      supportedEarlyCareerJobs: finalJobs.filter(
        (j) => j.status === 'open' && ['rotational_tdp', 'explicit_new_grad', 'entry_level'].includes(j.eligibility),
      ).length,
      uncertainJobs: finalJobs.filter((j) => j.status === 'open' && j.eligibility === 'possibly_eligible').length,
      softwareRotationalJobs: finalJobs.filter(
        (j) => j.status === 'open' && j.eligibility === 'rotational_tdp' && j.softwareRelevance === 'confirmed',
      ).length,
    },
    history,
  }

  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(path.join(DATA_DIR, 'companies.json'), JSON.stringify(companies, null, 2))
  await writeFile(path.join(DATA_DIR, 'jobs.json'), JSON.stringify(finalJobs, null, 2))
  await writeFile(path.join(DATA_DIR, 'collection-meta.json'), JSON.stringify(meta, null, 2))

  console.log(`Collection run finished at ${finishedAt}`)
  console.log(`  Companies attempted (ATS): ${allCandidateCompanies.length}`)
  console.log(`  Connected: ${connected.length}`)
  console.log(`  Failing: ${failing.length}`)
  console.log(`  Manual-directory companies: ${manualCompanies.length}`)
  console.log(`  Open jobs published: ${meta.counts.openJobs}`)
  console.log(`  Dataset published this run: ${!shouldKeepPreviousDataset}`)
  if (shouldKeepPreviousDataset) {
    console.log(`  Reason kept previous dataset: ${runSummary.skippedReason}`)
  }
}

main().catch((err) => {
  console.error('Collector crashed:', err)
  process.exitCode = 1
})
