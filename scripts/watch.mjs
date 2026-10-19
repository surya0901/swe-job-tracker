#!/usr/bin/env node
// Fast alert watcher CLI. Used by .github/workflows/watch.yml (every ~5
// minutes) and runnable locally:  node scripts/watch.mjs [--dry]
// State lives in WATCH_STATE_PATH (default .watch/state.json); on a first
// run it is seeded from the committed dataset so existing postings don't
// trigger a flood of "new" alerts.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { atsCandidateCompanies, workdayCandidateCompanies } from './companies.mjs'
import { runWatch, topCandidates, emptyState } from './lib/watch.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const STATE_PATH = process.env.WATCH_STATE_PATH || path.join(ROOT, '.watch', 'state.json')
const dry = process.argv.includes('--dry')

async function readJson(p, fallback) {
  try {
    return JSON.parse(await readFile(p, 'utf-8'))
  } catch {
    return fallback
  }
}

async function seedFromDataset() {
  const state = emptyState()
  const nowIso = new Date().toISOString()
  for (const job of await readJson(path.join(ROOT, 'public/data/jobs.json'), [])) state.seen[job.id] = nowIso
  for (const c of await readJson(path.join(ROOT, 'public/data/companies.json'), [])) {
    if (c.status === 'connected') state.companies[c.companyId] = true
  }
  return state
}

const candidates = topCandidates([...atsCandidateCompanies, ...workdayCandidateCompanies])
const state = (await readJson(STATE_PATH, null)) ?? (await seedFromDataset())

const { state: next, alerts, summary } = await runWatch({
  candidates,
  state,
  env: dry ? {} : process.env,
  siteUrl: process.env.SITE_URL || 'https://surya0901.github.io/swe-job-tracker/',
})

console.log(
  `Polled ${summary.polled} top-tier sources (${summary.connected} ok, ${summary.failing.length} failing). ` +
    `New qualifying roles: ${summary.newWorthy}. First-poll baselined: ${summary.baselined}.`,
)
for (const f of summary.failing) console.log(`  source failing: ${f.name} — ${String(f.error).slice(0, 120)}`)
for (const j of alerts) console.log(`  NEW: ${j.companyName} — ${j.title} (${j.location}) ${j.applyUrl}`)
if (alerts.length) {
  console.log(
    `  delivery: ok=[${summary.delivery.delivered}] failed=${JSON.stringify(summary.delivery.failed)} configured=[${summary.delivery.configured}]`,
  )
  if (summary.delivery.configured.length === 0) console.log('  (no email/push channel configured — alerts printed only)')
}

if (!dry) {
  await mkdir(path.dirname(STATE_PATH), { recursive: true })
  await writeFile(STATE_PATH, JSON.stringify(next))
}
// A configured channel that failed must be visible as a red run.
if (summary.delivery.failed.length && !summary.delivery.delivered.length) process.exitCode = 1
