// Pure reconciliation logic, extracted from collect.mjs so it's unit
// testable without hitting real network APIs.

import { detectProgramType } from './classifyJob.mjs'

export function normalizeJob({ company, source, raw, nowIso, previousById }) {
  const id = `${source.adapter}:${source.token}:${raw.sourceJobId}`
  const previous = previousById.get(id)
  return {
    id,
    companyId: company.companyId,
    companyName: company.name,
    industry: company.industry,
    title: raw.title,
    programType: detectProgramType(raw.title),
    location: raw.location || 'Not specified',
    workArrangement: /remote/i.test(raw.location || '') ? 'Remote' : 'Unspecified',
    applyUrl: raw.applyUrl,
    sourceUrl: raw.sourceUrl,
    sourceAdapter: source.adapter,
    description: raw.description,
    // Posted date only ever comes from the employer/source. If a fresh
    // fetch doesn't carry one, keep whatever we previously recorded — we
    // never invent a posted date, and "unknown" (null) is a valid value.
    postedAt: raw.postedAt ?? previous?.postedAt ?? null,
    discoveredAt: previous?.discoveredAt ?? nowIso,
    lastSeenAt: nowIso,
    lastCheckedAt: nowIso,
    missCount: 0,
    status: 'open',
    verified: true,
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
