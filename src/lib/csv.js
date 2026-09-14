const COLUMNS = [
  'companyName',
  'title',
  'industry',
  'programType',
  'eligibility',
  'location',
  'country',
  'workArrangement',
  'status',
  'verified',
  'applyUrl',
  'postedAt',
  'postedAtProvenance',
  'firstSeenAt',
  'lastCheckedAt',
  'closesAt',
  'notes',
]

// Escapes a cell for CSV: doubles internal quotes and quotes any value
// containing a comma/quote/newline. Also guards against CSV formula
// injection — a cell starting with =, +, -, or @ can be interpreted as a
// formula by Excel/Sheets when the file is opened, so such values are
// prefixed with a leading apostrophe (a standard, widely-supported
// neutralizer that displays harmlessly as text).
function escapeCell(value) {
  let str = String(value ?? '')
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`
  }
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function jobsToCsv(jobs) {
  const header = COLUMNS.join(',')
  const rows = jobs.map((job) => COLUMNS.map((col) => escapeCell(job[col])).join(','))
  return [header, ...rows].join('\n')
}

export function downloadCsv(jobs, filename = 'swe-tracker-export.csv') {
  const csv = jobsToCsv(jobs)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
