// Documented, testable classification — title AND description (when
// available), context-aware rather than pure keyword matching. Two
// separate axes, deliberately not collapsed into one:
//   - softwareRelevance: is this a software/technical engineering role at
//     all? A rotational/TDP program can be welding, materials, finance,
//     etc. — "Engineering Development Program" alone is not evidence.
//   - eligibility category: rotational_tdp / explicit_new_grad /
//     entry_level / possibly_eligible / excluded — early-career fit.
// This is our own heuristic assessment, not a guarantee — reviewState
// flags what a human should double check rather than silently guessing.

// ---- software relevance -----------------------------------------------

const SOFTWARE_CORE_TITLE = [
  /software engineer/i,
  /\bswe\b/i,
  /software develop/i,
  // Not strictly adjacent — real titles look like "Backend/API Engineer"
  // or "Backend, Payments Engineer" as often as "Backend Engineer".
  /\b(backend|back-end|frontend|front-end|full[\s-]?stack|\bAPI\b)\b[^,|]{0,40}\b(engineer|developer)\b/i,
  /platform engineer/i,
  /infrastructure engineer/i,
  /site reliability|\bsre\b/i,
  /qa engineer|test engineer|sdet|quality assurance engineer/i,
  /data engineer/i,
  /\bprogrammer\b/i,
  /application developer/i,
]

const PROGRAM_TITLE = [
  /rotational/i,
  /\btdp\b/i,
  /\bldp\b/i,
  /\beldp\b/i,
  /development program/i,
  /leadership program/i,
  /engineering (development|rotation|leadership)/i,
  /technology (development|leadership) program/i,
]

const NON_SOFTWARE_DISCIPLINE = [
  /welding/i,
  /\bmaterials?\b/i,
  /mechanical engineer/i,
  /\belectrical engineer(?!ing.*software)/i,
  /civil engineer/i,
  /chemical engineer/i,
  /industrial engineer/i,
  /manufacturing engineer/i,
  /supply chain/i,
  /human resources|\bhr\b(?! systems)/i,
  /\bfinance\b.*(rotational|program)|(rotational|program).*\bfinance\b/i,
  /marketing.*(rotational|program)/i,
  /sales.*(rotational|program)/i,
  /operations.*(rotational|program)/i,
  /biomedical/i,
  /clinical/i,
  /nursing/i,
  /mechanical|hvac|plant engineer/i,
  /aerospace engineer(?!ing.*software)/i,
  /real estate/i,
  /field representative/i,
  /casting|foundry|machining/i,
  /experience design|\bUX design\b/i,
]

// Deliberately specific — a bare mention of "software", "API", or
// "database" anywhere in a description is far too common in generic
// corporate boilerplate ("our software powers millions of businesses")
// to prove THIS role is a software role. Every pattern here is either a
// named technology or an explicit software-track qualifier phrase.
const SOFTWARE_TRACK_EVIDENCE = [
  /application development/i,
  /software development/i,
  /\bcybersecurity\b/i,
  /data (science|engineering)/i,
  /programming languages?/i,
  /\bcoding\b/i,
  /\b(java|python|javascript|typescript|c\+\+|golang|kotlin|sql)\b/i,
  /\b(react|angular|node\.?js|django|spring boot|kubernetes|docker)\b/i,
  /develop(ing|s)? (software|applications|systems|platforms)/i,
  /full[\s-]?stack/i,
  /write (code|software)/i,
  /software engineering (team|role|position)/i,
]

function matchesAny(patterns, text) {
  return text ? patterns.some((re) => re.test(text)) : false
}

export function classifySoftwareRelevance({ title, description = '' }) {
  if (matchesAny(SOFTWARE_CORE_TITLE, title)) {
    return { relevance: 'confirmed', reason: 'Title names a specific software engineering discipline.' }
  }

  if (matchesAny(PROGRAM_TITLE, title)) {
    if (matchesAny(NON_SOFTWARE_DISCIPLINE, title)) {
      return { relevance: 'not_software', reason: 'Title names a non-software discipline (e.g. welding, materials, mechanical).' }
    }
    if (matchesAny(SOFTWARE_TRACK_EVIDENCE, title) || matchesAny(SOFTWARE_TRACK_EVIDENCE, description)) {
      return { relevance: 'confirmed', reason: 'Rotational/development program with an explicit software track.' }
    }
    if (matchesAny(NON_SOFTWARE_DISCIPLINE, description)) {
      return { relevance: 'not_software', reason: 'Description names a non-software discipline.' }
    }
    return {
      relevance: 'uncertain',
      reason: 'Generic "development/rotational program" title with no explicit software-track evidence in the available text — program structure alone is not proof of software relevance.',
    }
  }

  // A completely generic title (no software-core term, no program
  // wording) is NOT confirmed as software-relevant purely from incidental
  // description boilerplate — corporate "about us" text routinely
  // mentions software/technology regardless of the role's actual
  // function (this was a real bug: sales and investigator titles at
  // software companies were passing as "confirmed" this way). A generic
  // title needs its OWN software-core wording to be included at all.
  return { relevance: 'not_software', reason: 'Title does not indicate a software/technical engineering role.' }
}

// ---- new-grad negation / redirect detection ----------------------------

const NEW_GRAD_MENTION = /(new grad|university grad|college grad|recent graduate|campus hire|early career)/i
const NEGATION_NEAR_APPLY =
  /(do not apply|does not apply|please do not apply|should not apply|not apply using this link|not eligible|not apply through this|cannot apply)/i
const REDIRECT_SIGNAL =
  /(apply (through|via|using) our (university|campus|new grad|early career)|visit our jobs page for (those|these) (specific )?postings|see our (new grad|university|campus) (careers|jobs) page|those (specific )?postings)/i

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean)
}

// Finds a sentence that both mentions new grads/interns AND redirects or
// negates them — e.g. Stripe's "if you are ... new grad ... please do not
// apply using this link and visit our jobs page for those specific
// postings." A bare "new grad" keyword elsewhere in the posting must not
// override this.
function findExclusionClause(text) {
  if (!text) return null
  for (const sentence of splitSentences(text)) {
    if (NEW_GRAD_MENTION.test(sentence) && (NEGATION_NEAR_APPLY.test(sentence) || REDIRECT_SIGNAL.test(sentence))) {
      return sentence.trim().slice(0, 400)
    }
  }
  return null
}

// ---- required vs. preferred experience ---------------------------------

const YEARS_PATTERN = /(\d+)\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?)/i

// Returns { minYears, clauseText } for the strictest REQUIRED years
// mention, quoting the source's own wording rather than synthesizing a
// range — "minimum of 2 years" must be quoted as-is, never rewritten into
// an invented "0-2 years".
function findRequiredYearsClause(description) {
  if (!description) return null
  let strictest = null
  for (const clause of splitSentences(description)) {
    if (/(preferred|nice to have|a plus|bonus|ideally)/i.test(clause)) continue
    if (!/(require|must have|minimum of|at least)/i.test(clause)) continue
    const match = clause.match(YEARS_PATTERN)
    if (!match) continue
    const years = Number(match[1])
    if (!strictest || years < strictest.minYears) {
      strictest = { minYears: years, clauseText: clause.trim().slice(0, 300) }
    }
  }
  return strictest
}

const HARD_EXCLUDE_TITLE = [
  { re: /\bintern(ship)?\b/i, reason: 'Title indicates an internship, not a full-time role.' },
  { re: /\bco-?op\b/i, reason: 'Title indicates a co-op, not a full-time role.' },
  {
    re: /\b(senior|sr\.?|staff|principal|distinguished|lead|architect|fellow)\b/i,
    reason: 'Title indicates a senior/lead-level role.',
  },
  { re: /\b(director|vp|vice president|head of)\b/i, reason: 'Title indicates a leadership/management role, not an IC engineering role.' },
  { re: /\bmanager\b/i, reason: 'Title indicates a management role.' },
  {
    re: /\b(?:[Ee]ngineer|[Dd]eveloper)\s*(?:II|III|IV|2|3|4)\b/,
    reason: 'Title level indicator (II/III/IV or 2/3/4) indicates a non-entry level.',
  },
]

const ROTATIONAL_SIGNAL = PROGRAM_TITLE

const NEW_GRAD_TITLE_SIGNAL = [/new grad/i, /university grad/i, /college grad/i, /class of \d{4}/i, /new college grad/i]

const NEW_GRAD_DESC_SIGNAL = [
  /new grad(uate)?/i,
  /class of \d{4}/i,
  /graduating (in |by )?\d{4}/i,
  /recent graduate/i,
  /currently pursuing a (bachelor|master|degree)/i,
  /early[\s-]?career/i,
  /early talent/i,
]

const ENTRY_LEVEL_TITLE_SIGNAL = [
  /\b(?:[Ee]ngineer|[Dd]eveloper)\s*I\b/,
  /\bassociate\b/i,
  /\bjunior\b/i,
  /\bentry[\s-]?level\b/i,
  /\b(engineer|developer)\s*1\b/i,
]

export function classifyEligibility({ title, description = '' }) {
  const softwareRelevance = classifySoftwareRelevance({ title, description })

  if (softwareRelevance.relevance === 'not_software') {
    return {
      category: 'excluded',
      softwareRelevance: 'not_software',
      reviewState: 'auto',
      evidence: [softwareRelevance.reason],
      excerpts: [],
    }
  }

  for (const { re, reason } of HARD_EXCLUDE_TITLE) {
    if (re.test(title)) {
      return {
        category: 'excluded',
        softwareRelevance: softwareRelevance.relevance,
        reviewState: 'auto',
        evidence: [reason],
        excerpts: [],
      }
    }
  }

  // Negative new-grad signals override any positive keyword match found
  // elsewhere in the same text — this is checked before anything that
  // would otherwise classify the posting as new-grad-friendly.
  const exclusionClause = findExclusionClause(description) ?? findExclusionClause(title)
  if (exclusionClause) {
    return {
      category: 'excluded',
      softwareRelevance: softwareRelevance.relevance,
      reviewState: 'auto',
      evidence: ['Posting explicitly redirects or excludes new grads/interns from applying via this listing (our assessment).'],
      excerpts: [exclusionClause],
    }
  }

  const requiredYears = findRequiredYearsClause(description)
  if (requiredYears && requiredYears.minYears >= 3) {
    return {
      category: 'excluded',
      softwareRelevance: softwareRelevance.relevance,
      reviewState: 'auto',
      evidence: ['Description requires experience beyond typical new-grad level (required, not preferred) — our assessment.'],
      excerpts: [requiredYears.clauseText],
    }
  }

  const reviewState = softwareRelevance.relevance === 'uncertain' ? 'needs_review' : 'auto'

  if (matchesAny(ROTATIONAL_SIGNAL, title)) {
    return {
      category: 'rotational_tdp',
      softwareRelevance: softwareRelevance.relevance,
      reviewState,
      evidence: ['Title matches a rotational/TDP/LDP program pattern (our assessment).'],
      excerpts: [],
    }
  }

  if (matchesAny(NEW_GRAD_TITLE_SIGNAL, title)) {
    return {
      category: 'explicit_new_grad',
      softwareRelevance: softwareRelevance.relevance,
      reviewState,
      evidence: ['Title explicitly says "new grad" (our assessment).'],
      excerpts: [],
    }
  }
  const descNewGradMatch = NEW_GRAD_DESC_SIGNAL.map((re) => description.match(re)).find(Boolean)
  if (descNewGradMatch) {
    return {
      category: 'explicit_new_grad',
      softwareRelevance: softwareRelevance.relevance,
      reviewState,
      evidence: ['Description accepts new grads (our assessment) — see excerpt.'],
      excerpts: [descNewGradMatch[0]],
    }
  }

  if (matchesAny(ENTRY_LEVEL_TITLE_SIGNAL, title)) {
    return {
      category: 'entry_level',
      softwareRelevance: softwareRelevance.relevance,
      reviewState,
      evidence: ['Title indicates an entry-level position (e.g. "Software Engineer I", "Associate") — our assessment.'],
      excerpts: [],
    }
  }
  if (requiredYears && requiredYears.minYears <= 2) {
    return {
      category: 'entry_level',
      softwareRelevance: softwareRelevance.relevance,
      reviewState,
      evidence: ['Description requires limited (0-2 year range) experience — see excerpt for the source\'s exact wording.'],
      excerpts: [requiredYears.clauseText],
    }
  }

  return {
    category: 'possibly_eligible',
    softwareRelevance: softwareRelevance.relevance,
    reviewState: 'needs_review',
    evidence: [
      'Software-relevant role with no explicit new-grad, entry-level, or seniority signal in the available text — review requirements before applying (our assessment, not a guarantee).',
    ],
    excerpts: [],
  }
}

export { classifySoftwareRelevance as _classifySoftwareRelevance }
