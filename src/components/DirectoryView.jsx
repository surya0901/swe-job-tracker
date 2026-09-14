import { useMemo, useState } from 'react'
import { COMPANY_STATUS_LABELS } from '../lib/constants'

const STATUS_BADGE = {
  connected: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  manual_verification_needed: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  source_failing: 'border-red-500/30 bg-red-500/10 text-red-300',
}

export default function DirectoryView({ companies, jobs }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const openCountByCompany = useMemo(() => {
    const counts = new Map()
    for (const job of jobs) {
      if (job.status !== 'open') continue
      counts.set(job.companyId, (counts.get(job.companyId) ?? 0) + 1)
    }
    return counts
  }, [jobs])

  const filtered = companies.filter((c) => {
    if (statusFilter !== 'All' && c.status !== statusFilter) return false
    if (search.trim() && !c.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="w-48 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="All">All Statuses</option>
          {Object.entries(COMPANY_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-zinc-500">{filtered.length} companies</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Company</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Open verified jobs</th>
              <th className="px-4 py-3 font-medium">Program / careers</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {filtered.map((c) => (
              <tr key={c.companyId} className="hover:bg-zinc-900/60">
                <td className="px-4 py-3 font-medium text-zinc-100">{c.name}</td>
                <td className="px-4 py-3 text-zinc-400">{c.industry}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[c.status]}`}
                  >
                    {COMPANY_STATUS_LABELS[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-400">{openCountByCompany.get(c.companyId) ?? 0}</td>
                <td className="px-4 py-3">
                  {c.careersUrl ? (
                    <a
                      href={c.careersUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-300 hover:underline"
                    >
                      {c.programName || 'Careers page'} ↗
                    </a>
                  ) : c.source ? (
                    <span className="text-zinc-500">
                      via {c.source.adapter} ({c.source.token})
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-zinc-600">
                  No companies match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
