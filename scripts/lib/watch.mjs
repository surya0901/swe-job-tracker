// The fast path: poll only the top-tier companies' newest postings,
// diff against what was already seen, and alert on new qualifying roles.
// Pure orchestration over injectable pieces (store, fetchers, deliver) so
// it runs unchanged in Node CLI / GitHub Actions and in a Cloudflare Worker.

import { collectFromCandidate, sourceKey } from './sources.mjs'
import { normalizeJob } from './reconcile.mjs'
import { isAlertWorthy, buildAlertMessage } from './alerts.mjs'
import { deliver, configuredChannels } from './notify.mjs'
import { mapWithConcurrency } from './fetchWithRetry.mjs'
import { isTopCompany } from '../bigCompanies.mjs'

const SEEN_TTL_MS = 21 * 24 * 60 * 60 * 1000

export function emptyState() {
  // seen: jobId -> ISO time last observed. companies: companyIds we have
  // already baselined (their first-ever poll alerts nothing).
  return { seen: {}, companies: {}, updatedAt: null }
}

export function topCandidates(allCandidates) {
  return allCandidates.filter(([name]) => isTopCompany(name))
}

/**
 * @returns {{ state, alerts, summary }} — `state` is the new state to
 * persist; jobs are only added to `seen` when their alert was delivered
 * (or when no alert was due), so a failed send is retried next poll.
 */
export async function runWatch({
  candidates,
  state,
  env = {},
  nowIso = new Date().toISOString(),
  siteUrl,
  fetchImpl = fetch,
  collect = collectFromCandidate,
  concurrency = 6,
}) {
  const seen = { ...state.seen }
  const baselined = { ...state.companies }

  const skipIdsFor = (candidate) => {
    const prefix = `${candidate.adapter}:${sourceKey(candidate)}:`
    const ids = new Set()
    for (const id of Object.keys(seen)) if (id.startsWith(prefix)) ids.add(id.slice(prefix.length))
    return ids
  }

  const results = await mapWithConcurrency(candidates, concurrency, (c) => collect(c, { mode: 'watch', skipIdsFor }))

  const newWorthy = []
  const newOther = []
  const baselineIds = []
  const failing = []

  for (const result of results) {
    if (result.status !== 'connected') {
      failing.push({ name: result.name, error: result.error })
      continue
    }
    const firstPoll = !baselined[result.companyId]
    for (const raw of result.rawJobs) {
      if (!raw.title) continue
      const job = normalizeJob({ company: result, source: result.source, raw, nowIso, previousById: new Map() })
      if (job.eligibility === 'excluded' || seen[job.id]) continue
      if (firstPoll) baselineIds.push(job.id)
      else if (isAlertWorthy(job)) newWorthy.push(job)
      else newOther.push(job.id)
    }
    baselined[result.companyId] = true
  }

  for (const id of [...baselineIds, ...newOther]) seen[id] = nowIso

  let delivery = { delivered: [], failed: [], configured: configuredChannels(env) }
  if (newWorthy.length > 0) {
    const message = buildAlertMessage(newWorthy, { siteUrl })
    delivery = await deliver(message, env, fetchImpl)
    if (delivery.delivered.length > 0) for (const job of newWorthy) seen[job.id] = nowIso
  }

  // Keep refreshing timestamps of what we still see; expire the rest.
  const cutoff = Date.parse(nowIso) - SEEN_TTL_MS
  for (const [id, at] of Object.entries(seen)) if (Date.parse(at) < cutoff) delete seen[id]

  return {
    state: { seen, companies: baselined, updatedAt: nowIso },
    alerts: newWorthy,
    summary: {
      polled: candidates.length,
      connected: results.filter((r) => r.status === 'connected').length,
      failing,
      newWorthy: newWorthy.length,
      baselined: baselineIds.length,
      delivery,
    },
  }
}
