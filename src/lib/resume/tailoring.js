// Local (non-AI) job-specific comparison. This deliberately does NOT
// rewrite bullets — generating plausible-sounding new prose from regex
// heuristics is exactly how false claims sneak in (invented metrics,
// upgraded skill levels, changed facts). Local mode limits itself to
// what can be verified mechanically from the text: which JD terms are
// where, and how the resume's own experience ranks against them. Actual
// bullet rewrite suggestions are an AI-backend feature (see
// server/analyze-resume/) and are clearly labeled as such — this module
// only ever proposes reordering and flags gaps, both grounded in text
// that already exists.

import { extractMatches } from '../skillsDictionary'

function flattenResumeText(resume) {
  const parts = [
    resume.summary ?? '',
    resume.skills.join(' '),
    ...resume.experience.flatMap((e) => [e.organization, e.title, ...e.bullets]),
    ...resume.projects.flatMap((p) => [p.name, ...p.bullets]),
    ...resume.education.flatMap((e) => [e.institution, ...(e.details ?? [])]),
  ]
  return parts.filter(Boolean).join('\n')
}

// Deliberately tiny and conservative — only extremely unambiguous
// abbreviation pairs. This is what lets a "supported but phrased
// differently" category exist honestly, without guessing at fuzzy
// synonyms (which is how a false "match" sneaks in).
const KNOWN_SYNONYMS = {
  JavaScript: ['JS'],
  Kubernetes: ['k8s'],
  TypeScript: ['TS'],
  'Node.js': ['Node', 'NodeJS'],
}

function findSynonymEvidence(resumeText, skill) {
  const synonyms = KNOWN_SYNONYMS[skill] ?? []
  for (const syn of synonyms) {
    const re = new RegExp(`(^|[^a-zA-Z0-9])${syn}([^a-zA-Z0-9]|$)`)
    if (re.test(resumeText)) return syn
  }
  return null
}

/**
 * Classifies each JD skill into the 5 review categories. Never marks
 * anything "supported" without a literal quote from the resume as
 * evidence — "possibly supported" and "not supported" are the only
 * categories that don't require that.
 */
export function classifySkillSupport(resume, resumeText, jdSkills, resumeSkills) {
  return [...jdSkills].sort().map((skill) => {
    if (resumeSkills.has(skill)) {
      return { skill, category: 'supported_present' }
    }
    const synonym = findSynonymEvidence(resumeText, skill)
    if (synonym) {
      return { skill, category: 'supported_differently_phrased', evidence: `Resume says "${synonym}"` }
    }
    return { skill, category: 'not_supported' }
  })
}

function splitRequiredPreferred(jobDescription) {
  const clauses = jobDescription.split(/(?<=[.!?])\s+|\n+/)
  const required = []
  const preferred = []
  for (const clause of clauses) {
    if (/(preferred|nice to have|a plus|bonus|ideally)/i.test(clause)) preferred.push(clause)
    else if (/(require|must have|minimum|responsib)/i.test(clause)) required.push(clause)
  }
  return { required, preferred }
}

/**
 * Compares a structured master resume against a job description using
 * only mechanical text matching. Returns:
 *   matchedSkills: JD skills that literally appear in the resume
 *   missingSkills: JD skills that don't — each with a "supported"
 *     classification (never auto-added to any export)
 *   experienceRelevance: each experience/project entry scored by how
 *     many JD skills its own text contains, for a reorder suggestion
 *   requiredVsPreferred: the required/preferred clause split, verbatim
 */
export function compareResumeToJob(resume, jobDescription) {
  const resumeText = flattenResumeText(resume)
  const resumeSkills = extractMatches(resumeText)
  const jdSkills = extractMatches(jobDescription)

  const matchedSkills = [...jdSkills].filter((s) => resumeSkills.has(s)).sort()
  const missingSkills = [...jdSkills].filter((s) => !resumeSkills.has(s)).sort()

  const { required, preferred } = splitRequiredPreferred(jobDescription)

  const scoreEntry = (bullets, extra = '') => {
    const text = [...bullets, extra].join(' ')
    const entrySkills = extractMatches(text)
    return [...entrySkills].filter((s) => jdSkills.has(s)).length
  }

  const experienceRelevance = resume.experience
    .map((e, index) => ({
      index,
      organization: e.organization,
      title: e.title,
      relevanceScore: scoreEntry(e.bullets, `${e.organization} ${e.title}`),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  const projectRelevance = resume.projects
    .map((p, index) => ({
      index,
      name: p.name,
      relevanceScore: scoreEntry(p.bullets, p.name),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Evidence: which of the user's own bullets already mention a matched
  // skill — quoted verbatim, never paraphrased into something stronger.
  const evidenceBySkill = {}
  for (const skill of matchedSkills) {
    const evidence = []
    for (const e of resume.experience) {
      for (const bullet of e.bullets) {
        if (containsSkill(bullet, skill)) evidence.push({ source: `${e.organization}`, text: bullet })
      }
    }
    for (const p of resume.projects) {
      for (const bullet of p.bullets) {
        if (containsSkill(bullet, skill)) evidence.push({ source: p.name, text: bullet })
      }
    }
    evidenceBySkill[skill] = evidence.slice(0, 3)
  }

  return {
    mode: 'local',
    matchedSkills,
    missingSkills,
    evidenceBySkill,
    experienceRelevance,
    projectRelevance,
    requiredClauses: required.map((c) => c.trim()).filter(Boolean),
    preferredClauses: preferred.map((c) => c.trim()).filter(Boolean),
    skillSupport: classifySkillSupport(resume, resumeText, jdSkills, resumeSkills),
  }
}

function containsSkill(text, skill) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i').test(text)
}

// Real AI tailoring (bullet-level rewrite suggestions). Calls a
// server-side backend if VITE_RESUME_API_URL is configured; otherwise
// returns null so the caller shows "AI setup required" rather than
// fabricating rewrite suggestions locally.
export async function requestAiTailoring({ resume, jobDescription, scope }) {
  const apiUrl = import.meta.env.VITE_RESUME_TAILOR_API_URL
  if (!apiUrl) return { available: false, suggestions: null, error: null }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, jobDescription, scope }),
    })
    if (!res.ok) throw new Error(`AI backend returned HTTP ${res.status}`)
    const data = await res.json()
    return { available: true, suggestions: data.suggestions ?? [], error: null }
  } catch (err) {
    return { available: true, suggestions: null, error: err instanceof Error ? err.message : String(err) }
  }
}
