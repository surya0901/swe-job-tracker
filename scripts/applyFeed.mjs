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
  if (j.locationScope === 'Unknown' && !US.test(j.location ?? '')) return false;
  return Boolean(j.applyUrl);
}

const isTarget = (name) => TARGETS.some((t) => name.toLowerCase().includes(t));
const jobs = JSON.parse(readFileSync('public/data/jobs.json', 'utf8'));
const feed = jobs.filter(good).map((j) => ({
  id: j.id, company: j.companyName, title: j.title, location: j.location, url: j.applyUrl,
  firstSeenAt: j.firstSeenAt, eligibility: j.eligibility, tier: isTarget(j.companyName) ? 'target' : j.isTopCompany ? 'big' : 'other',
}));
const rank = { target: 0, big: 1, other: 2 };
feed.sort((a, b) => rank[a.tier] - rank[b.tier] || (b.firstSeenAt ?? '').localeCompare(a.firstSeenAt ?? ''));
writeFileSync('public/data/apply-feed.json', JSON.stringify({ generatedAt: new Date().toISOString(), jobs: feed }));
console.log(`apply-feed: ${feed.length} roles (${feed.filter((j) => j.tier === 'target').length} at target companies)`);
