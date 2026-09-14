// Heuristic location normalization. The original location text is always
// preserved verbatim alongside this — these are best-effort derived
// fields for filtering, not a claim of authoritative geocoding.

const US_STATE_ABBR = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
])

const COUNTRY_HINTS = [
  { re: /\b(united states|usa|u\.s\.a?\.?)\b/i, country: 'US' },
  { re: /\b(canada)\b/i, country: 'CA' },
  { re: /\b(united kingdom|uk|england|london|scotland)\b/i, country: 'UK' },
  { re: /\b(india|bangalore|bengaluru|hyderabad|pune|gurgaon|gurugram|mumbai|chennai)\b/i, country: 'IN' },
  { re: /\b(germany|berlin|munich)\b/i, country: 'DE' },
  { re: /\b(ireland|dublin)\b/i, country: 'IE' },
  { re: /\b(singapore)\b/i, country: 'SG' },
  { re: /\b(australia|sydney|melbourne)\b/i, country: 'AU' },
  { re: /\b(france|paris)\b/i, country: 'FR' },
  { re: /\b(netherlands|amsterdam)\b/i, country: 'NL' },
  { re: /\b(brazil|são paulo|sao paulo)\b/i, country: 'BR' },
  { re: /\b(mexico)\b/i, country: 'MX' },
  { re: /\b(japan|tokyo)\b/i, country: 'JP' },
  { re: /\b(china|shanghai|beijing)\b/i, country: 'CN' },
  { re: /\b(qatar|doha)\b/i, country: 'QA' },
  { re: /\b(poland|warsaw)\b/i, country: 'PL' },
  { re: /\b(romania|bucharest)\b/i, country: 'RO' },
  { re: /\b(spain|barcelona|madrid)\b/i, country: 'ES' },
]

export function detectCountry(locationText) {
  if (!locationText) return 'Unspecified'
  const stateMatch = locationText.match(/,\s*([A-Z]{2})\b/)
  if (stateMatch && US_STATE_ABBR.has(stateMatch[1])) return 'US'
  for (const { re, country } of COUNTRY_HINTS) {
    if (re.test(locationText)) return country
  }
  return 'Unspecified'
}

export function detectWorkArrangement(locationText) {
  if (!locationText) return 'Unspecified'
  if (/remote/i.test(locationText)) return 'Remote'
  if (/hybrid/i.test(locationText)) return 'Hybrid'
  if (/on-?site/i.test(locationText)) return 'Onsite'
  return 'Unspecified'
}
