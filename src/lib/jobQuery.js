export function filterJobs(jobs, { search, industry, programType, status, location, availability }) {
  return jobs.filter((job) => {
    if (industry && industry !== 'All' && job.industry !== industry) return false
    if (programType && programType !== 'All' && job.programType !== programType) return false
    if (status && status !== 'All' && job.status !== status) return false
    if (location && location.trim()) {
      const loc = (job.location || '').toLowerCase()
      if (!loc.includes(location.trim().toLowerCase())) return false
    }
    if (availability && availability !== 'All') {
      const jobAvailability = job.verified === false ? 'unverified' : job.status === 'closed' ? 'closed' : 'open'
      if (jobAvailability !== availability) return false
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase()
      const haystack = `${job.companyName} ${job.title}`.toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}

const SORTERS = {
  company: (a, b) => a.companyName.localeCompare(b.companyName),
  title: (a, b) => a.title.localeCompare(b.title),
  posted: (a, b) => new Date(b.postedAt ?? 0) - new Date(a.postedAt ?? 0),
  discovered: (a, b) => new Date(b.discoveredAt ?? 0) - new Date(a.discoveredAt ?? 0),
}

export function sortJobs(jobs, sortKey) {
  const sorter = SORTERS[sortKey] ?? SORTERS.discovered
  return [...jobs].sort(sorter)
}

export function paginate(items, page, pageSize) {
  const start = (page - 1) * pageSize
  return items.slice(start, start + pageSize)
}
