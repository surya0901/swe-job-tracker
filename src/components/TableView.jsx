import { STATUSES } from '../data/seedCompanies'

export default function TableView({ companies, onOpen, onStatusChange }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">Company</th>
            <th className="px-4 py-3 font-medium">Program</th>
            <th className="px-4 py-3 font-medium">Industry</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Location</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {companies.map((company) => (
            <tr
              key={company.id}
              className="cursor-pointer transition hover:bg-zinc-900/60"
              onClick={() => onOpen(company)}
            >
              <td className="px-4 py-3 font-medium text-zinc-100">
                {company.name}
              </td>
              <td className="px-4 py-3 text-zinc-400">{company.programName}</td>
              <td className="px-4 py-3 text-zinc-400">{company.industry}</td>
              <td className="px-4 py-3 text-zinc-400">{company.programType}</td>
              <td className="px-4 py-3 text-zinc-400">{company.location}</td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <select
                  value={company.status}
                  onChange={(e) => onStatusChange(company.id, e.target.value)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
          {companies.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-zinc-600">
                No companies match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
