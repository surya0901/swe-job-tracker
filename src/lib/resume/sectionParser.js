// Heuristic parser: raw extracted resume text -> structured sections.
// This is real, deterministic parsing (no AI) — and it is explicitly NOT
// claimed to be perfect. Every section keeps its original raw text
// alongside any further-parsed structure, extraction confidence is
// flagged, and nothing here invents content that wasn't in the text.

const SECTION_HEADINGS = {
  summary: /^(summary|objective|professional summary|about me)$/i,
  education: /^education$/i,
  experience: /^(experience|work experience|professional experience|employment)$/i,
  projects: /^projects?$/i,
  skills: /^(skills|technical skills|skills\s*&\s*technologies|core competencies)$/i,
  certifications: /^(certifications?|licenses?)$/i,
  awards: /^(awards?|honors?|publications?)$/i,
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/
const URL_RE = /(https?:\/\/[^\s,]+|(?:www\.|linkedin\.com|github\.com)[^\s,]+)/gi
const DATE_RANGE_RE =
  /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4})\s*(?:[-–—]|to)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}|\d{4}|present|current)/i

function isLikelyHeading(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 40) return null
  for (const [key, re] of Object.entries(SECTION_HEADINGS)) {
    if (re.test(trimmed)) return key
  }
  return null
}

function extractLinks(text) {
  const matches = text.match(URL_RE) ?? []
  return [...new Set(matches)].map((url) => ({
    url: url.startsWith('http') ? url : `https://${url}`,
    label: /linkedin/i.test(url) ? 'LinkedIn' : /github/i.test(url) ? 'GitHub' : 'Link',
  }))
}

function parseContact(headerLines) {
  const text = headerLines.join(' ')
  const email = text.match(EMAIL_RE)?.[0] ?? null
  const phone = text.match(PHONE_RE)?.[0] ?? null
  const links = extractLinks(text)
  // The name is very likely the first non-empty line, as long as it
  // doesn't itself look like contact info.
  const name = headerLines.find((l) => l.trim() && !EMAIL_RE.test(l) && !PHONE_RE.test(l) && !URL_RE.test(l)) ?? ''
  return { name: name.trim(), email, phone, links, raw: headerLines.join('\n') }
}

// Splits an EXPERIENCE/PROJECTS section's raw lines into entries. A new
// entry starts at a line that looks like a header (short, not a bullet,
// often containing a date range or separated by a blank line from the
// previous bullet block). This is a heuristic, not a guarantee — entries
// that don't split cleanly are still preserved as raw text.
function splitEntries(lines) {
  const entries = []
  let current = null
  // A new entry starts at a non-bullet line that immediately follows a
  // bullet (or is the very first line) — consecutive non-bullet lines
  // before any bullets appear are the same entry's multi-line header
  // (e.g. "Company — Title" then "Date range" then "Location" as
  // separate lines), not three different jobs.
  let previousWasBullet = true

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    const isBullet = /^[•\-*▪◦]/.test(line)
    const dateMatch = line.match(DATE_RANGE_RE)
    const isDateOnlyLine = dateMatch && line.replace(DATE_RANGE_RE, '').trim().length <= 3

    if (!isBullet && (current === null || previousWasBullet)) {
      if (current) entries.push(current)
      current = {
        headerLine: line,
        headerExtra: [],
        startDate: dateMatch?.[1] ?? null,
        endDate: dateMatch?.[2] ?? null,
        bullets: [],
        raw: [line],
      }
    } else if (current) {
      current.raw.push(line)
      if (isBullet) {
        current.bullets.push(line.replace(/^[•\-*▪◦]\s*/, ''))
      } else if (isDateOnlyLine) {
        current.startDate = current.startDate ?? dateMatch[1]
        current.endDate = current.endDate ?? dateMatch[2]
      } else {
        // Another header-block line (degree/title on its own line,
        // location, etc.) — kept distinct from the primary header rather
        // than concatenated into one unreadable string.
        current.headerExtra.push(line)
        if (!current.startDate && dateMatch) {
          current.startDate = dateMatch[1]
          current.endDate = dateMatch[2]
        }
      }
    }
    previousWasBullet = isBullet
  }
  if (current) entries.push(current)
  return entries
}

function parseExperienceEntry(entry) {
  // "Company — Title" or "Title, Company" or just one of them; kept
  // ambiguous on purpose rather than guessing which side is which when
  // it's not clearly delimited.
  const header = entry.headerLine.replace(DATE_RANGE_RE, '').trim().replace(/[,–—-]+$/, '')
  const parts = header.split(/\s+[–—|]\s+|\s{2,}/).filter(Boolean)
  const [titleFromExtra, ...remainingExtra] = entry.headerExtra
  return {
    organization: parts[0] ?? header,
    title: parts[1] ?? titleFromExtra ?? null,
    startDate: entry.startDate,
    endDate: entry.endDate,
    bullets: [...remainingExtra, ...entry.bullets],
    raw: entry.raw.join('\n'),
  }
}

function parseSkills(lines) {
  const text = lines.join(', ')
  return text
    .split(/[,•\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Parses raw extracted resume text into structured sections. Returns
 * { contact, summary, education, experience, projects, skills,
 *   certifications, additionalSections, rawText, confidence, warnings }
 */
export function parseResumeText(rawText) {
  const lines = rawText.split('\n')
  const warnings = []

  // Everything before the first recognized heading is the contact block.
  let firstHeadingIndex = lines.findIndex((l) => isLikelyHeading(l) !== null)
  if (firstHeadingIndex === -1) firstHeadingIndex = Math.min(lines.length, 5)
  const headerLines = lines.slice(0, firstHeadingIndex)
  const contact = parseContact(headerLines)
  if (!contact.email) warnings.push('No email address detected — check the contact section.')
  if (!contact.name) warnings.push('Could not confidently detect a name — check the top of the resume.')

  // Walk the rest, bucketing lines under whichever heading we last saw.
  const buckets = {}
  let currentKey = null
  for (let i = firstHeadingIndex; i < lines.length; i++) {
    const heading = isLikelyHeading(lines[i])
    if (heading) {
      currentKey = heading
      buckets[currentKey] = buckets[currentKey] ?? []
      continue
    }
    if (currentKey) {
      buckets[currentKey] = buckets[currentKey] ?? []
      buckets[currentKey].push(lines[i])
    }
  }

  const experience = (buckets.experience ?? []).length
    ? splitEntries(buckets.experience).map(parseExperienceEntry)
    : []
  const projects = (buckets.projects ?? []).length
    ? splitEntries(buckets.projects).map((e) => ({
        name: e.headerLine.replace(DATE_RANGE_RE, '').trim(),
        bullets: [...e.headerExtra, ...e.bullets],
        raw: e.raw.join('\n'),
      }))
    : []
  const education = (buckets.education ?? []).length
    ? splitEntries(buckets.education).map((e) => ({
        institution: e.headerLine.replace(DATE_RANGE_RE, '').trim(),
        startDate: e.startDate,
        endDate: e.endDate,
        // Degree/GPA lines that appeared on their own line stay distinct
        // from the institution name instead of being concatenated into it.
        details: [...e.headerExtra, ...e.bullets],
        raw: e.raw.join('\n'),
      }))
    : []
  const skills = buckets.skills ? parseSkills(buckets.skills) : []
  const certifications = (buckets.certifications ?? []).filter((l) => l.trim()).map((l) => ({ raw: l.trim() }))
  const summary = buckets.summary ? buckets.summary.join(' ').trim() : null

  const additionalSections = Object.entries(buckets)
    .filter(([key]) => !['summary', 'education', 'experience', 'projects', 'skills', 'certifications'].includes(key))
    .map(([key, sectionLines]) => ({ heading: key, content: sectionLines.join('\n').trim() }))
    .filter((s) => s.content)

  if (experience.length === 0) warnings.push('No Experience section detected — if you have one, check the heading text matches "Experience".')
  if (skills.length === 0) warnings.push('No Skills section detected.')

  const confidence = warnings.length === 0 ? 'high' : warnings.length <= 2 ? 'medium' : 'low'

  return {
    contact,
    summary,
    education,
    experience,
    projects,
    skills,
    certifications,
    additionalSections,
    rawText,
    confidence,
    warnings,
  }
}
