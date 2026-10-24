import { describe, it, expect, vi } from 'vitest'
import { isAlertWorthy, buildAlertMessage } from '../scripts/lib/alerts.mjs'
import { classifyEligibility } from '../scripts/lib/eligibility.mjs'
import { isTopCompany } from '../scripts/bigCompanies.mjs'
import { deliver, configuredChannels, headerText } from '../scripts/lib/notify.mjs'
import { runWatch, emptyState } from '../scripts/lib/watch.mjs'
import { detectLocationScope } from '../scripts/lib/geography.mjs'

const base = {
  id: 'greenhouse:janestreet:1',
  companyName: 'Jane Street',
  title: 'Software Engineer, New Grad',
  status: 'open',
  eligibility: 'explicit_new_grad',
  eligibilityExcerpts: [],
  softwareRelevance: 'confirmed',
  roleFamily: 'swe',
  locationScope: 'US',
  location: 'New York, NY',
  applyUrl: 'https://example.com/apply',
}

describe('isAlertWorthy', () => {
  it('alerts for a new-grad SWE role at a top company', () => {
    expect(isAlertWorthy(base)).toBe(true)
  })
  it('ignores companies outside the top tier', () => {
    expect(isAlertWorthy({ ...base, companyName: 'Some Startup' })).toBe(false)
  })
  it('ignores generic software roles with no early-career signal', () => {
    expect(isAlertWorthy({ ...base, eligibility: 'possibly_eligible' })).toBe(false)
  })
  it('ignores international roles but keeps unknown-location ones', () => {
    expect(isAlertWorthy({ ...base, locationScope: 'International' })).toBe(false)
    expect(isAlertWorthy({ ...base, locationScope: 'Unknown' })).toBe(true)
  })
  it('ignores entry-level inferred only from a body sentence', () => {
    expect(isAlertWorthy({ ...base, eligibility: 'entry_level', eligibilityExcerpts: ['2 years experience'] })).toBe(false)
    expect(isAlertWorthy({ ...base, eligibility: 'entry_level' })).toBe(true)
  })
  it('ignores closed postings', () => {
    expect(isAlertWorthy({ ...base, status: 'closed' })).toBe(false)
  })
})

describe('tier list', () => {
  it('includes the firms the user named', () => {
    for (const n of ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix', 'Citadel', 'Jane Street', 'JPMorgan Chase']) {
      expect(isTopCompany(n)).toBe(true)
    }
  })
})

describe('classifier: tech ops and full-time', () => {
  it('recognizes an entry-level technology operations program as tech ops', () => {
    const r = classifyEligibility({ title: 'Technology Operations Analyst Program - 2027 Early Career', description: '' })
    expect(r.roleFamily).toBe('tech_ops')
    expect(r.softwareRelevance).toBe('confirmed')
    expect(r.category).not.toBe('excluded')
  })
  it('excludes level 5+ engineer titles', () => {
    expect(classifyEligibility({ title: 'Full Stack Engineer 5', description: '' }).category).toBe('excluded')
  })
  it('excludes part-time and contract titles', () => {
    expect(classifyEligibility({ title: 'Software Engineer (Contract)', description: '' }).category).toBe('excluded')
  })
})

describe('notify', () => {
  it('reports which channels are configured', () => {
    expect(configuredChannels({})).toEqual([])
    expect(configuredChannels({ RESEND_API_KEY: 'k', ALERT_EMAIL_TO: 'a@b.c', NTFY_TOPIC: 't' })).toEqual(['email', 'push'])
  })
  it('sends via Resend and ntfy and records failures per channel', async () => {
    const calls = []
    const fetchImpl = async (url) => {
      calls.push(url)
      return url.includes('resend') ? { ok: false, status: 403, text: async () => 'nope' } : { ok: true, status: 200 }
    }
    const msg = buildAlertMessage([base])
    const r = await deliver(msg, { RESEND_API_KEY: 'k', ALERT_EMAIL_TO: 'a@b.c', NTFY_TOPIC: 't' }, fetchImpl)
    expect(r.delivered).toEqual(['push'])
    expect(r.failed[0].channel).toBe('email')
    expect(calls).toHaveLength(2)
  })
  it('sends push headers that real fetch accepts when the title has non-Latin-1 characters', async () => {
    let sent
    // new Headers() enforces the same ByteString rule that made fetch throw in CI.
    const fetchImpl = async (_url, init) => {
      sent = new Headers(init.headers)
      return { ok: true, status: 200 }
    }
    const msg = { subject: 'Stripe — Software Engineer, New Grad (Taiwan)', text: 'x', firstUrl: 'https://stripe.com/jobs/ü' }
    const r = await deliver(msg, { NTFY_TOPIC: 't' }, fetchImpl)
    expect(r.failed).toEqual([])
    expect(r.delivered).toEqual(['push'])
    const b64 = sent.get('Title').match(/^=\?UTF-8\?B\?(.+)\?=$/)[1]
    expect(Buffer.from(b64, 'base64').toString('utf8')).toBe(msg.subject)
    expect(sent.get('Click')).toBe('https://stripe.com/jobs/%C3%BC')
  })
  it('leaves plain ASCII titles untouched', () => {
    expect(headerText('3 new roles at Jane Street')).toBe('3 new roles at Jane Street')
  })
})

function fakeCollect(rawJobs) {
  return async ([name]) => ({
    companyId: name.toLowerCase().replace(/ /g, '-'),
    name,
    industry: 'Quant/Trading',
    status: 'connected',
    source: { adapter: 'greenhouse', token: 'janestreet' },
    rawJobs,
    coverageComplete: true,
  })
}
const raw = (id, title) => ({ sourceJobId: id, title, location: 'New York, NY', applyUrl: 'https://x/' + id, sourceUrl: 'https://x/' + id, description: 'new grad software engineer role', postedAt: null })

describe('runWatch', () => {
  const env = { NTFY_TOPIC: 'topic' }
  const ok = async () => ({ ok: true, status: 200 })

  it('baselines a company silently on its first poll, then alerts only on genuinely new roles', async () => {
    const first = await runWatch({
      candidates: [['Jane Street', 'Quant/Trading', []]],
      state: emptyState(),
      env,
      fetchImpl: ok,
      collect: fakeCollect([raw('1', 'Software Engineer, New Grad')]),
    })
    expect(first.alerts).toHaveLength(0)
    expect(first.summary.baselined).toBe(1)

    const second = await runWatch({
      candidates: [['Jane Street', 'Quant/Trading', []]],
      state: first.state,
      env,
      fetchImpl: ok,
      collect: fakeCollect([raw('1', 'Software Engineer, New Grad'), raw('2', 'Software Engineer, New Grad 2027')]),
    })
    expect(second.alerts.map((j) => j.id)).toEqual(['greenhouse:janestreet:2'])
    expect(second.summary.delivery.delivered).toEqual(['push'])

    const third = await runWatch({
      candidates: [['Jane Street', 'Quant/Trading', []]],
      state: second.state,
      env,
      fetchImpl: ok,
      collect: fakeCollect([raw('1', 'Software Engineer, New Grad'), raw('2', 'Software Engineer, New Grad 2027')]),
    })
    expect(third.alerts).toHaveLength(0)
  })

  it('does not mark a role seen when delivery fails, so it is retried', async () => {
    const state = { seen: {}, companies: { 'jane-street': true }, updatedAt: null }
    const bad = vi.fn(async () => ({ ok: false, status: 500 }))
    const r = await runWatch({
      candidates: [['Jane Street', 'Quant/Trading', []]],
      state,
      env,
      fetchImpl: bad,
      collect: fakeCollect([raw('9', 'Software Engineer, New Grad')]),
    })
    expect(r.alerts).toHaveLength(1)
    expect(r.state.seen['greenhouse:janestreet:9']).toBeUndefined()
  })
})

describe('geography: more countries', () => {
  it('treats Taiwan as international, not unknown', () => {
    expect(detectLocationScope('Taiwan')).toBe('International')
  })
})
