// Writes public/data/apply-feed.json: a small list of open, US, clearly
// early-career software roles for the daily "apply to 10" checklist in
// pyforge. Target companies first, then other big companies, newest first.
import { readFileSync, writeFileSync } from 'node:fs';

const TARGETS = ['citadel', 'hudson river trading', 'jane street', 'meta', 'microsoft', 'amazon', 'google', 'netflix', 'apple', 'nvidia', 'openai', 'goldman sachs', 'jpmorgan', 'j.p. morgan', 'jp morgan'];
const US = /united states|\busa?\b|\bremote\b|,\s*(A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|PA|RI|S[CD]|T[NX]|UT|V[AT]|W[AIVY])\b/i;

function good(j) {
  if (j.status === 'closed' || j.verified === false) return false;
  if (j.reviewState === 'needs_review' || j.eligibility === 'possibly_eligible') return false;
  if ((j.roleFamily ?? 'swe') !== 'swe') return false;
  if (j.locationScope === 'International') return false;
  if (j.locationScope !== 'US' && !US.test(j.location ?? '')) return false;
  const t = j.title ?? '';
  // Too senior for a new grad: banks use "Associate" and "VP" for experienced hires.
  if (/\b(senior|sr\.?|staff|principal|lead|manager|director|vice president|vp)\b|\b(II|III|IV)\b/i.test(t)) return false;
  if (/\bassociate\b/i.test(t) && /goldman|morgan|citi|bank of america|barclays|ubs|deutsche|wells fargo|jpmorgan|j\.p\./i.test(j.companyName ?? '')) return false;
  return Boolean(j.applyUrl);
}

const isTarget = (name) => TARGETS.some((t) => name.toLowerCase().includes(t));
const jobs = JSON.parse(readFileSync('public/data/jobs.json', 'utf8'));
const now = Date.now();
const feed = jobs.filter(good).map((j) => {
  const posted = j.postedAt ?? j.firstSeenAt;
  const tier = isTarget(j.companyName) ? 'target' : j.isTopCompany ? 'big' : 'other';
  const ageDays = Math.max(0, Math.floor((now - new Date(posted).getTime()) / 86_400_000));
  return { id: j.id, company: j.companyName, title: j.title, location: j.location, url: j.applyUrl, posted, ageDays, eligibility: j.eligibility, programType: j.programType, tier };
});
// Freshness matters most (early applicants get read), with a head start for
// your target companies and other big names.
const boost = { target: 10, big: 5, other: 0 };
feed.sort((a, b) => (a.ageDays - boost[a.tier]) - (b.ageDays - boost[b.tier]));
writeFileSync('public/data/apply-feed.json', JSON.stringify({ generatedAt: new Date().toISOString(), jobs: feed }));
console.log(`apply-feed: ${feed.length} roles (${feed.filter((j) => j.tier === 'target').length} at target companies)`);
