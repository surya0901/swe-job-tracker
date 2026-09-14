// Pure reconciliation logic, extracted from collect.mjs so it's unit
// testable without hitting real network APIs.

import { detectProgramType } from './classifyJob.mjs'
import { classifyEligibility } from './eligibility.mjs'
import { detectCountry, detectWorkArrangement } from './geography.mjs'

function sourceKey(source) {
  return source.token ?? source.tenant
}

export function normalizeJob({ company, source, raw, nowIso, previousById }) {
  const id = `${source.adapter}:${sourceKey(source)}:${raw.sourceJobId}`
  const previous = previousById.get(id)
  const eligibility = classifyEligibility({ title: raw.title, description: raw.description })
  return {
    id,
    companyId: company.companyId,
    companyName: company.name,
    industry: company.industry,
    title: raw.title,
    programType: detectProgramType(raw.title),
    location: raw.location || 'Not specified',
    country: detectCountry(raw.location),
    workArrangement: detectWorkArrangement(raw.location),
    applyUrl: raw.applyUrl,
    sourceUrl: raw.sourceUrl,
    sourceAdapter: source.adapter,
    description: raw.description,
    // Posted date only ever comes from a source-documented "posted" or
    // "published" semantic (see each adapter's comments) — never a
    // last-modified/updated timestamp. If a fresh fetch doesn't carry
    // one, keep whatever we previously recorded; we never invent a
    // posted date, and "unknown" (null) is a valid, displayed value.
    postedAt: raw.postedAt ?? previous?.postedAt ?? null,
    postedAtProvenance: raw.postedAtProvenance ?? previous?.postedAtProvenance ?? 'unavailable',
    postedAtRawText: raw.postedAtRawText ?? previous?.postedAtRawText ?? null,
    // Platform "last updated" timestamp, when the source exposes one —
    // distinct from postedAt, never used as a substitute for it.
    sourceUpdatedAt: raw.sourceUpdatedAt ?? null,
    // Application deadline, when the source provides one. None of the
    // current adapters expose this — always null today, but the field
    // exists so a future source that does isn't a schema migration.
    closesAt: raw.closesAt ?? previous?.closesAt ?? null,
    firstSeenAt: previous?.firstSeenAt ?? previous?.discoveredAt ?? nowIso,
    lastSeenAt: nowIso,
    lastCheckedAt: nowIso,
    missCount: 0,
    status: 'open',
    verified: true,
    eligibility: eligibility.category,
    eligibilityEvidence: eligibility.evidence,
  }
}

/**
 * Merge this run's freshly-collected jobs with the previously published
 * set. A job only gets closed after MISS_THRESHOLD consecutive runs where
 * its company's source succeeded but the job didn't reappear — a single
 * missed fetch, or a company whose source failed entirely this run, never
 * closes anything.
 */
const MISS_THRESHOLD = 3

export function reconcileJobs({ freshJobs, previousJobs, succeededCompanyIds, nowIso }) {
  const freshIds = new Set(freshJobs.map((j) => j.id))
  const reconciled = [...freshJobs]

  for (const prevJob of previousJobs) {
    if (freshIds.has(prevJob.id)) continue
    if (!succeededCompanyIds.has(prevJob.companyId)) {
      reconciled.push(prevJob)
      continue
    }
    const missCount = (prevJob.missCount ?? 0) + 1
    if (missCount >= MISS_THRESHOLD) {
      reconciled.push({ ...prevJob, status: 'closed', missCount, lastCheckedAt: nowIso })
    } else {
      reconciled.push({ ...prevJob, missCount, lastCheckedAt: nowIso })
    }
  }

  return reconciled
}

export function shouldKeepPreviousDataset({ connectedCount, attemptedCount, previousOpenCount, freshOpenCount }) {
  const allSourcesFailed = connectedCount === 0 && attemptedCount > 0
  const catastrophicDrop = previousOpenCount >= 20 && freshOpenCount < previousOpenCount * 0.2
  return allSourcesFailed || catastrophicDrop
}
