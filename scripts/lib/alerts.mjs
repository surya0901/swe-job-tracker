// What counts as worth an instant alert. Deliberately strict: a top-tier
// company, an open full-time role, a software or tech-ops discipline we are
// confident about, and a posting that actually signals early-career fit.
// "possibly_eligible" (software role, no new-grad signal) is NOT alerted —
// it shows up on the site, but would make the alerts noisy.

import { isTopCompany } from '../bigCompanies.mjs'

export const ALERT_ELIGIBILITY = ['rotational_tdp', 'explicit_new_grad', 'entry_level']

export function isAlertWorthy(job, { topCompany = isTopCompany } = {}) {
  if (job.status && job.status !== 'open') return false
  if (!topCompany(job.companyName)) return false
  if (!ALERT_ELIGIBILITY.includes(job.eligibility)) return false
  if (job.softwareRelevance !== 'confirmed') return false
  // "Entry level" inferred from a "0-2 years" sentence in the body is a
  // weak signal (it can be a stray requirement bullet); alert only when the
  // title itself says entry level. New-grad / rotational signals stand alone.
  if (job.eligibility === 'entry_level' && (job.eligibilityExcerpts?.length ?? 0) > 0) return false
  // International roles are skipped; unknown locations are kept (a missed
  // alert costs more than an extra email) and labelled as such.
  if (job.locationScope === 'International') return false
  return true
}

const ELIGIBILITY_LABEL = {
  rotational_tdp: 'Rotational / development program',
  explicit_new_grad: 'New grad',
  entry_level: 'Entry level',
}

export function describeJob(job) {
  const family = job.roleFamily === 'tech_ops' ? 'Tech ops' : 'Software'
  const posted = job.postedAt ? `posted ${job.postedAt.slice(0, 10)}` : 'posted date not published'
  const where = job.locationScope === 'Unknown' ? `${job.location} (location unclear)` : job.location
  return {
    line: `${job.companyName} — ${job.title}`,
    detail: `${family} · ${ELIGIBILITY_LABEL[job.eligibility] ?? job.eligibility} · ${where} · ${posted}`,
    url: job.applyUrl || job.sourceUrl,
  }
}

export function buildAlertMessage(jobs, { siteUrl } = {}) {
  const companies = [...new Set(jobs.map((j) => j.companyName))]
  const subject =
    jobs.length === 1
      ? `New role: ${jobs[0].companyName} — ${jobs[0].title}`
      : `${jobs.length} new roles: ${companies.slice(0, 3).join(', ')}${companies.length > 3 ? ' +' + (companies.length - 3) : ''}`
  const items = jobs.map(describeJob)
  const text = [
    ...items.map((i) => `${i.line}\n  ${i.detail}\n  Apply: ${i.url}`),
    siteUrl ? `\nAll openings: ${siteUrl}` : '',
    '\nClassification is our own assessment from the posting text — read the requirements before applying.',
  ]
    .filter(Boolean)
    .join('\n\n')
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  const html = `<div style="font:15px/1.5 Georgia,serif;color:#1c1a17;max-width:560px">${items
    .map(
      (i) =>
        `<p style="margin:0 0 18px"><strong style="font-size:16px">${esc(i.line)}</strong><br><span style="color:#6b655b">${esc(i.detail)}</span><br><a href="${esc(i.url)}" style="color:#7a2e1d">Apply →</a></p>`,
    )
    .join('')}<p style="color:#6b655b;font-size:13px">Classification is our own assessment from the posting text — read the requirements before applying.${siteUrl ? ` <a href="${esc(siteUrl)}" style="color:#7a2e1d">All openings</a>` : ''}</p></div>`
  return { subject, text, html, firstUrl: items[0]?.url }
}
