// Title/description-based classification. This is a heuristic filter run
// against real posting text — it does not invent postings, only decides
// whether a real posting we fetched belongs in a "new grad / rotational
// software engineering" tracker.

const EXCLUDE_PATTERNS = [
  /\bintern(ship)?\b/i,
  /\bco-?op\b/i,
  /\bsenior\b/i,
  /\bsr\.?\s/i,
  /\bstaff\b/i,
  /\bprincipal\b/i,
  /\blead\b(?!ership)/i,
  /\bmanager\b/i,
  /\bdirector\b/i,
  /\bvp\b/i,
  /\bvice president\b/i,
  /\bhead of\b/i,
  /\barchitect\b/i,
  /\b(\d+)\+?\s*-?\s*(years|yrs)\b/i, // "5+ years" style seniority gates
]

const SOFTWARE_SIGNAL = [
  /software engineer/i,
  /\bswe\b/i,
  /software developer/i,
  /developer program/i,
  /engineering (development|rotation|leadership)/i,
  /technology (development|leadership) program/i,
  /\btdp\b/i,
  /\beldp\b/i,
  /full[\s-]?stack/i,
  /backend|back-end/i,
  /frontend|front-end/i,
  /site reliability/i,
  /\bsre\b/i,
  /platform engineer/i,
  /data engineer/i,
  /qa engineer|test engineer|sdet/i,
]

const NEW_GRAD_SIGNAL = [
  /new grad/i,
  /university grad/i,
  /college grad/i,
  /early career/i,
  /early talent/i,
  /entry[\s-]?level/i,
  /class of \d{4}/i,
  /rotational/i,
  /development program/i,
  /leadership program/i,
  /\btdp\b/i,
  /\bldp\b/i,
  /\beldp\b/i,
  /university program/i,
  /graduate program/i,
  /associate (software )?engineer/i,
]

export function isExcluded(title) {
  return EXCLUDE_PATTERNS.some((re) => re.test(title))
}

export function isSoftwareRelated(title) {
  return SOFTWARE_SIGNAL.some((re) => re.test(title))
}

export function isNewGradSignal(title) {
  return NEW_GRAD_SIGNAL.some((re) => re.test(title))
}

export function detectProgramType(title) {
  return /rotational|\btdp\b|\bldp\b|\beldp\b|development program|leadership program/i.test(title)
    ? 'Rotational'
    : 'Standard'
}

/**
 * Returns true if this real posting belongs on a new-grad / rotational SWE
 * tracker: it must look software-related, must show some new-grad/entry
 * signal (title OR the company's own program metadata already marks it as
 * new-grad), and must not match an exclusion pattern (internship, senior,
 * years-of-experience gate, etc).
 */
export function shouldInclude(title, { assumeNewGrad = false } = {}) {
  if (isExcluded(title)) return false
  if (!isSoftwareRelated(title)) return false
  return assumeNewGrad || isNewGradSignal(title)
}
