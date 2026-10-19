// Cloudflare Worker: the ~1-minute alert watcher. Runs the SAME polling,
// classification and alert logic as scripts/watch.mjs, on a cron trigger
// that fires every minute. Not deployed by this repo — it needs your own
// Cloudflare account (see README, "One-minute alerts").
//
// State (which postings were already seen) lives in a KV namespace bound as
// STATE. Secrets: RESEND_API_KEY, ALERT_EMAIL_TO, optional ALERT_EMAIL_FROM,
// NTFY_TOPIC.

import { atsCandidateCompanies, workdayCandidateCompanies } from '../../scripts/companies.mjs'
import { runWatch, topCandidates, emptyState } from '../../scripts/lib/watch.mjs'

const STATE_KEY = 'watch-state-v1'

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(poll(env))
  },
  // Visiting the worker URL runs one poll and shows a summary — handy for testing.
  async fetch(_request, env) {
    const summary = await poll(env)
    return new Response(JSON.stringify(summary, null, 2), { headers: { 'content-type': 'application/json' } })
  },
}

async function poll(env) {
  const state = (await env.STATE.get(STATE_KEY, 'json')) ?? emptyState()
  const { state: next, summary } = await runWatch({
    candidates: topCandidates([...atsCandidateCompanies, ...workdayCandidateCompanies]),
    state,
    env,
    siteUrl: env.SITE_URL || 'https://surya0901.github.io/swe-job-tracker/',
    concurrency: 4,
  })
  await env.STATE.put(STATE_KEY, JSON.stringify(next))
  return summary
}
