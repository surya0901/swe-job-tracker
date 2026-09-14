export function formatExactDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatRelativeAge(iso) {
  if (!iso) return null
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

// "Posted: Not provided" — never a fabricated today's-date fallback.
export function describePosted(job) {
  if (!job.postedAt) return { exact: 'Not provided', relative: null, approximate: false }
  const approximate = job.postedAtProvenance !== 'employer_structured'
  return {
    exact: formatExactDate(job.postedAt),
    relative: formatRelativeAge(job.postedAt),
    approximate,
    rawText: job.postedAtRawText ?? null,
  }
}
