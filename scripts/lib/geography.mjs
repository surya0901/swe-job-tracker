// Heuristic location normalization. The original location text is always
// preserved verbatim alongside this — these are best-effort derived
// fields for filtering, not a claim of authoritative geocoding.
//
// locationScope is deliberately a 4-state field, not a boolean US/not-US:
//   'US'            — every parsed location is in the US
//   'International'  — every parsed location is outside the US
//   'Mixed'          — a multi-location posting spanning both
//   'Unknown'        — couldn't confidently parse any location
// Unknown must never be silently folded into US or International — the
// UI surfaces it as its own state with an explicit include/exclude toggle.

const US_STATE_ABBR = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
])

const COUNTRY_HINTS = [
  { re: /\b(united states|usa|u\.s\.a?\.?|us remote)\b/i, country: 'US' },
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

function detectSegmentCountry(segment) {
  const stateMatch = segment.match(/,\s*([A-Z]{2})\b/)
  if (stateMatch && US_STATE_ABBR.has(stateMatch[1])) return 'US'
  for (const { re, country } of COUNTRY_HINTS) {
    if (re.test(segment)) return country
  }
  return null
}

// Splits a multi-location string like "McLean, VA; Richmond, VA; US
// Remote" or "3 Locations" into individual segments. A bare count with no
// real place names ("3 Locations", "Multiple Locations") yields no
// segments — that's the Unknown case, not zero countries.
function splitLocations(text) {
  if (!text) return []
  if (/^\s*\d+\s*locations?\s*$/i.test(text.trim())) return []
  if (/^\s*multiple locations\s*$/i.test(text.trim())) return []
  return text
    .split(/;|\n| or /)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function detectCountry(locationText, structuredCountry = null) {
  if (structuredCountry) {
    // Workday's detail API gives an authoritative country descriptor for
    // the primary location — prefer it over text guessing when present.
    if (/united states/i.test(structuredCountry)) return 'US'
    const hint = COUNTRY_HINTS.find(({ re }) => re.test(structuredCountry))
    if (hint) return hint.country
  }
  const segments = splitLocations(locationText)
  if (segments.length === 0) return 'Unspecified'
  const countries = segments.map(detectSegmentCountry)
  if (countries.every((c) => c === 'US')) return 'US'
  if (countries.every((c) => c !== null && c !== 'US')) return countries[0] ?? 'Unspecified'
  if (countries.some((c) => c !== null)) return 'Mixed'
  return 'Unspecified'
}

// Coarser than detectCountry — the axis the UI filters/defaults on.
export function detectLocationScope(locationText, structuredCountry = null) {
  const country = detectCountry(locationText, structuredCountry)
  if (country === 'US') return 'US'
  if (country === 'Unspecified') return 'Unknown'
  if (country === 'Mixed') return 'Mixed'
  return 'International'
}

export function detectWorkArrangement(locationText) {
  if (!locationText) return 'Unspecified'
  if (/remote/i.test(locationText)) return 'Remote'
  if (/hybrid/i.test(locationText)) return 'Hybrid'
  if (/on-?site/i.test(locationText)) return 'Onsite'
  return 'Unspecified'
}
