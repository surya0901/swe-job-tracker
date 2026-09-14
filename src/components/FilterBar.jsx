import { PROGRAM_TYPES, STATUSES } from '../lib/constants'

export default function FilterBar({
  filters,
  onChange,
  industries,
  search,
  onSearchChange,
  showStatus = true,
  showAvailability = false,
  rightSlot = null,
}) {
  const update = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search company or title..."
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

      {showStatus && (
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
      )}

      {showAvailability && (
        <select
          value={filters.availability}
          onChange={(e) => update('availability', e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="All">All Availability</option>
          <option value="open">Verified open</option>
          <option value="closed">Closed</option>
          <option value="unverified">Unverified / custom</option>
        </select>
      )}

      <input
        type="text"
        value={filters.location}
        onChange={(e) => update('location', e.target.value)}
        placeholder="Location contains..."
        className="w-40 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
      />

      {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
    </div>
  )
}
