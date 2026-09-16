const DAY_MS = 24 * 60 * 60 * 1000

export function filterJobs(
  jobs,
  {
    search,
    industry,
    programType,
    status,
    location,
    availability,
    locationScope,
    includeUnknownLocations,
    postedWithin,
    eligibility,
    includeNeedsReview,
  },
) {
  const now = Date.now()
  return jobs.filter((job) => {
    if (industry && industry !== 'All' && job.industry !== industry) return false
    if (programType && programType !== 'All' && job.programType !== programType) return false
    if (status && status !== 'All' && job.status !== status) return false
    if (eligibility && eligibility !== 'All' && job.eligibility !== eligibility) return false
    // "Posting is open" (status) and "candidate is eligible" are kept as
    // separate axes throughout — this toggle hides the uncertain bucket
    // by default without ever touching job.status.
    if (!includeNeedsReview && job.reviewState === 'needs_review' && (!eligibility || eligibility === 'All')) {
      return false
    }
    if (location && location.trim()) {
      const loc = (job.location || '').toLowerCase()
      if (!loc.includes(location.trim().toLowerCase())) return false
    }
    if (job.locationScope === 'Unknown') {
      // Unknown is its own state, never silently folded into US,
      // International, or Mixed. The toggle only unions it into the
      // broad default/All views — picking a *specific* scope like
      // "International only" stays exclusive, since Unknown is not
      // evidence of that scope either.
      const broadView = !locationScope || locationScope === 'All' || locationScope === 'US'
      if (!includeUnknownLocations || !broadView) return false
    } else if (locationScope && locationScope !== 'All' && job.locationScope !== locationScope) {
      return false
    }
    if (availability && availability !== 'All') {
      const jobAvailability = job.verified === false ? 'unverified' : job.status === 'closed' ? 'closed' : 'open'
      if (jobAvailability !== availability) return false
    }
    if (postedWithin && postedWithin !== 'All') {
      if (postedWithin === 'recently_discovered') {
        // Posted date unknown, but our collector saw it for the first
        // time recently — the closest available proxy for "new" when the
        // source doesn't expose a real posted date.
        if (job.postedAt) return false
        const foundAgeMs = now - new Date(job.firstSeenAt).getTime()
        if (foundAgeMs > 7 * DAY_MS) return false
      } else {
        const days = { '24h': 1, '3d': 3, '7d': 7, '30d': 30 }[postedWithin]
        if (!job.postedAt) return false
        const ageMs = now - new Date(job.postedAt).getTime()
        if (ageMs > days * DAY_MS || ageMs < 0) return false
      }
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      const haystack = `${job.companyName} ${job.title}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

// Sorters treat a missing date as "unknown" and always place it last,
// regardless of sort direction — an unknown date is not the same as "very
// old" or "very new" and shouldn't be visually confused with either.
function dateSort(field, direction = 'desc') {
  return (a, b) => {
    const av = a[field]
    const bv = b[field]
    if (!av && !bv) return 0
    if (!av) return 1
    if (!bv) return -1
    const diff = new Date(bv) - new Date(av)
    return direction === 'desc' ? diff : -diff
  }
}

const PROGRAM_PRIORITY = { rotational_tdp: 0, explicit_new_grad: 1, entry_level: 2, possibly_eligible: 3 }

const SORTERS = {
  relevance: (a, b) => {
    const pa = PROGRAM_PRIORITY[a.eligibility] ?? 4
    const pb = PROGRAM_PRIORITY[b.eligibility] ?? 4
    if (pa !== pb) return pa - pb
    return dateSort('firstSeenAt')(a, b)
  },
  company: (a, b) => a.companyName.localeCompare(b.companyName),
  title: (a, b) => a.title.localeCompare(b.title),
  posted: dateSort('postedAt'),
  firstSeen: dateSort('firstSeenAt'),
  closesAt: (a, b) => dateSort('closesAt', 'asc')(a, b),
}

export function sortJobs(jobs, sortKey) {
  const sorter = SORTERS[sortKey] ?? SORTERS.relevance
  return [...jobs].sort(sorter)
}

export function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}
