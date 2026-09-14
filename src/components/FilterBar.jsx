import { PROGRAM_TYPES, STATUSES } from '../data/seedCompanies'

export default function FilterBar({
  filters,
  onChange,
  industries,
  view,
  onViewChange,
  search,
  onSearchChange,
}) {
  const update = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search companies..."
        className="w-48 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
      />

      <select
        value={filters.industry}
        onChange={(e) => update('industry', e.target.value)}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
      >
        <option value="All">All Industries</option>
        {industries.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>

      <select
        value={filters.programType}
        onChange={(e) => update('programType', e.target.value)}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
      >
        <option value="All">All Program Types</option>
        {PROGRAM_TYPES.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => update('status', e.target.value)}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
      >
        <option value="All">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
        {['kanban', 'table'].map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`rounded px-3 py-1 text-xs font-medium capitalize transition ${
              view === v
                ? 'bg-indigo-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}
