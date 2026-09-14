import { extractMatches } from './skillsDictionary'

// Real, local, deterministic comparison of the exact text the user pasted.
// No network call, no fabricated content — every "suggestion" only names
// keywords actually present in the job description and actually absent
// from the resume text, and every "evidence" bullet is a line copied
// verbatim from the user's own resume. This is intentionally not an AI
// rewrite: without a real model call it's safer to point at gaps than to
// invent prose that reads like a fabricated accomplishment.
export function analyzeLocally(jobDescription, resume) {
  const jdSkills = extractMatches(jobDescription)
  const resumeSkills = extractMatches(resume)

  const matchedKeywords = [...jdSkills].filter((s) => resumeSkills.has(s)).sort()
  const missingKeywords = [...jdSkills].filter((s) => !resumeSkills.has(s)).sort()

  const bullets = splitBullets(resume)
  const bulletEvidence = bullets
    .map((bullet) => ({
      bullet,
      matchedSkills: matchedKeywords.filter((skill) => containsSkill(bullet, skill)),
    }))
    .filter((b) => b.matchedSkills.length > 0)

  const suggestions = missingKeywords.slice(0, 10).map((keyword) => ({
    keyword,
    note: `This job description mentions "${keyword}"; it doesn't appear anywhere in your resume text. If you have real, honest experience with it, add it explicitly — don't leave it implied.`,
  }))

  const realityCheck = buildRealityCheck({ jobDescription, jdSkills, resumeSkills })

  return {
    mode: 'local',
    matchedKeywords,
    missingKeywords,
    bulletEvidence,
    suggestions,
    realityCheck,
  }
}

function splitBullets(resume) {
  return resume
    .split('\n')
    .map((line) => line.replace(/^[\s•\-*·]+/, '').trim())
    .filter((line) => line.length > 12)
}

function containsSkill(text, skill) {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
  return pattern.test(text)
}

function buildRealityCheck({ jobDescription, jdSkills, resumeSkills }) {
  const notes = []

  if (jdSkills.size === 0) {
    notes.push(
      "This dictionary-based matcher didn't detect specific technical keywords in the job description text — it only spots explicit terms from a fixed skills list, so a JD written in prose without named technologies will show little here.",
    )
  } else {
    const matched = [...jdSkills].filter((s) => resumeSkills.has(s)).length
    const coverage = matched / jdSkills.size
    if (coverage < 0.3) {
      notes.push(
        `Only ${matched} of ${jdSkills.size} detected JD keywords also appear in your resume text. That doesn't necessarily mean you lack the experience — it means your resume doesn't currently state it in matching language, which is what an ATS keyword scan and a skimming recruiter both rely on.`,
      )
    }
  }

  const yearsMatch = jobDescription.match(/(\d+)\+?\s*(?:years|yrs)/i)
  if (yearsMatch) {
    notes.push(
      `The job description references "${yearsMatch[0]}" — be ready to honestly address how your actual experience (internships, coursework, projects) does or doesn't line up with that expectation.`,
    )
  }

  if (notes.length === 0) {
    notes.push(
      'No major keyword gaps or seniority red flags detected by this local check — that only covers explicit keyword overlap, not whether your actual depth of experience matches what the role needs.',
    )
  }

  return notes
}

// Optional real AI backend. Configure VITE_RESUME_API_URL to point at a
// server-side route (see server/analyze-resume/ for a deployable example)
// that holds the LLM API key server-side and never in this bundle. If it's
// not configured, or the call fails, we fall back to the local analysis
// above and say so explicitly — we never silently show fabricated AI-style
// output when no AI ran.
export async function analyzeResume(jobDescription, resume) {
  const apiUrl = import.meta.env.VITE_RESUME_API_URL

  if (!apiUrl) {
    return { ...analyzeLocally(jobDescription, resume), aiConfigured: false, aiError: null }
  }

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription, resume }),
    })
    if (!res.ok) throw new Error(`AI backend returned HTTP ${res.status}`)
    const data = await res.json()
    return { ...data, mode: 'ai', aiConfigured: true, aiError: null }
  } catch (err) {
    return {
      ...analyzeLocally(jobDescription, resume),
      aiConfigured: true,
      aiError: err instanceof Error ? err.message : String(err),
    }
  }
}
