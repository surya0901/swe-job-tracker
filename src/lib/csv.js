const COLUMNS = [
  'companyName',
  'title',
  'industry',
  'programType',
  'location',
  'status',
  'verified',
  'applyUrl',
  'postedAt',
  'discoveredAt',
  'notes',
]

function escapeCell(value) {
  const str = String(value ?? '')
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
