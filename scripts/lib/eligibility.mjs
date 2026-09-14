// Documented, testable new-grad/rotational eligibility classification.
// Runs on title AND description (when available — not every source
// exposes one, see each adapter's comments) rather than title alone, and
// never rejects a role just because its description mentions internships
// or senior colleagues in passing.
//
// Categories:
//   'rotational_tdp'    - explicit rotational/TDP/LDP program, software-relevant
//   'explicit_new_grad'  - title/description explicitly says new grad / class of YYYY
//   'entry_level'         - entry-level signal (title "I"/Associate/Junior, or
//                           description states 0-2 years required)
//   'possibly_eligible'   - software-relevant, no clear signal either way
//   'excluded'            - not software-relevant, or a hard exclusion matched

const SOFTWARE_TITLE_SIGNAL = [
  /software engineer/i,
  /\bswe\b/i,
  /software develop/i,
  /\b(backend|back-end|frontend|front-end|full[\s-]?stack)\b/i,
  /platform engineer/i,
  /infrastructure engineer/i,
  /site reliability|\bsre\b/i,
  /qa engineer|test engineer|sdet|quality assurance engineer/i,
  /data engineer/i,
  /engineering (development|rotation|leadership)/i,
  /technology (development|leadership) program/i,
  /\btdp\b/i,
  /\beldp\b/i,
]

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
    // Matches "Engineer II", "Engineer 2 (Onsite)", "Developer III" etc.
    // anywhere in the title, not just at the end — real postings often
    // append a location/work-mode suffix after the level indicator.
    re: /\b(?:[Ee]ngineer|[Dd]eveloper)\s*(?:II|III|IV|2|3|4)\b/,
    reason: 'Title level indicator (II/III/IV or 2/3/4) indicates a non-entry level.',
  },
]

const ROTATIONAL_SIGNAL = [/rotational/i, /\btdp\b/i, /\bldp\b/i, /\beldp\b/i, /development program/i, /leadership program/i]

const NEW_GRAD_TITLE_SIGNAL = [
  /new grad/i,
  /university grad/i,
  /college grad/i,
  /class of \d{4}/i,
  /new college grad/i,
]

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
  // "Software Engineer I" / "Engineer I -(Onsite)" / "Developer I" — a
  // role-level "I" is a real, common level-1 signal, even when followed
  // by a location/work-mode suffix, so this isn't anchored to
  // end-of-string. \bI\b never matches inside "II"/"III" (no word
  // boundary between consecutive I's), and HARD_EXCLUDE_TITLE's ii/iii/iv
  // check runs first regardless, so "Engineer II" is excluded before
  // reaching this check.
  // (not case-insensitive: the trailing "I" must stay uppercase so this
  // doesn't match the pronoun "i" in unrelated text)
  /\b(?:[Ee]ngineer|[Dd]eveloper)\s*I\b/,
  /\bassociate\b/i,
  /\bjunior\b/i,
  /\bentry[\s-]?level\b/i,
  /\b(engineer|developer)\s*1\b/i,
]

// Matches "3+ years", "5-7 years", "minimum of 2 years" etc., capturing
// the number for a required-experience check.
const YEARS_PATTERN = /(\d+)\+?\s*(?:-\s*\d+\s*)?(?:years?|yrs?)/gi

function extractRequiredYears(description) {
  if (!description) return null
  // Split into sentences/clauses so we can tell "required" language from
  // "preferred"/"nice to have"/"a plus" language around each years-mention,
  // instead of rejecting on any years-of-experience mention anywhere in
  // the text.
  const clauses = description.split(/[.;\n]/)
  let minRequired = null
  for (const clause of clauses) {
    const isPreferred = /(preferred|nice to have|a plus|bonus|ideally)/i.test(clause)
    if (isPreferred) continue
    const isRequired = /(require|must have|minimum of|at least)/i.test(clause)
    YEARS_PATTERN.lastIndex = 0
    const match = YEARS_PATTERN.exec(clause)
    if (match && isRequired) {
      const years = Number(match[1])
      if (minRequired === null || years < minRequired) minRequired = years
    }
  }
  return minRequired
}

export function classifyEligibility({ title, description = '' }) {
  const evidence = []

  const isSoftware = SOFTWARE_TITLE_SIGNAL.some((re) => re.test(title))
  if (!isSoftware) {
    return { category: 'excluded', evidence: ['Title does not indicate a software/technical engineering role.'] }
  }

  for (const { re, reason } of HARD_EXCLUDE_TITLE) {
    if (re.test(title)) {
      return { category: 'excluded', evidence: [reason] }
    }
  }

  const requiredYears = extractRequiredYears(description)
  if (requiredYears !== null && requiredYears >= 3) {
    return {
      category: 'excluded',
      evidence: [`Description requires ${requiredYears}+ years of experience (required, not preferred).`],
    }
  }

  const isRotational = ROTATIONAL_SIGNAL.some((re) => re.test(title))
  if (isRotational) {
    evidence.push('Title matches a rotational/TDP/LDP program pattern.')
    return { category: 'rotational_tdp', evidence }
  }

  if (NEW_GRAD_TITLE_SIGNAL.some((re) => re.test(title))) {
    evidence.push('Title explicitly says "new grad".')
    return { category: 'explicit_new_grad', evidence }
  }
  const descNewGradMatch = NEW_GRAD_DESC_SIGNAL.find((re) => re.test(description))
  if (descNewGradMatch) {
    const match = description.match(descNewGradMatch)
    evidence.push(`Description accepts new grads: "${match[0]}".`)
    return { category: 'explicit_new_grad', evidence }
  }

  if (ENTRY_LEVEL_TITLE_SIGNAL.some((re) => re.test(title))) {
    evidence.push('Title indicates an entry-level position (e.g. "Software Engineer I", "Associate").')
    return { category: 'entry_level', evidence }
  }
  if (requiredYears !== null && requiredYears <= 2) {
    evidence.push(`Description requires ${requiredYears === 0 ? '0' : requiredYears}-2 years of experience.`)
    return { category: 'entry_level', evidence }
  }

  evidence.push('Software-relevant role with no explicit new-grad, entry-level, or seniority signal — review requirements before applying.')
  return { category: 'possibly_eligible', evidence }
}
