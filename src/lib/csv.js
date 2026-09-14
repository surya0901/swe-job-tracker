const COLUMNS = [
  'name',
  'programName',
  'industry',
  'programType',
  'location',
  'status',
  'dateAdded',
  'url',
  'notes',
]

function escapeCell(value) {
  const str = String(value ?? '')
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function companiesToCsv(companies) {
  const header = COLUMNS.join(',')
  const rows = companies.map((co) =>
    COLUMNS.map((col) => escapeCell(co[col])).join(','),
  )
  return [header, ...rows].join('\n')
}

export function downloadCsv(companies, filename = 'swe-tracker-export.csv') {
  const csv = companiesToCsv(companies)
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
