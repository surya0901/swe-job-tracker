import { PROGRAM_TYPES, STATUSES } from '../lib/constants'

const ELIGIBILITY_OPTIONS = [
  { value: 'rotational_tdp', label: 'Rotational/TDP' },
  { value: 'explicit_new_grad', label: 'Explicit new grad' },
  { value: 'entry_level', label: 'Entry level' },
  { value: 'possibly_eligible', label: 'Review requirements' },
]

const POSTED_WITHIN_OPTIONS = [
  { value: '24h', label: 'Posted within 24h' },
  { value: '3d', label: 'Posted within 3 days' },
  { value: '7d', label: 'Posted within 7 days' },
  { value: '30d', label: 'Posted within 30 days' },
  { value: 'recently_discovered', label: 'Recently discovered (no posted date)' },
]

export default function FilterBar({
  filters,
  onChange,
  industries,
  search,
  onSearchChange,
  showStatus = true,
  showAvailability = false,
  showDateFilters = false,
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
        aria-label="Search company or title"
        className="w-48 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
      />

      <select
        aria-label="Filter by industry"
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
        aria-label="Filter by program type"
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
        aria-label="Filter by eligibility"
        value={filters.eligibility}
        onChange={(e) => update('eligibility', e.target.value)}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
      >
        <option value="All">All Eligibility</option>
        {ELIGIBILITY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {showStatus && (
        <select
          aria-label="Filter by application status"
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
          aria-label="Filter by availability"
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

      {showDateFilters && (
        <>
          <select
            aria-label="Filter by country"
            value={filters.country}
            onChange={(e) => update('country', e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="US">US roles (default)</option>
            <option value="All">All countries</option>
            <option value="International">International only</option>
          </select>

          <select
            aria-label="Filter by posted date"
            value={filters.postedWithin}
            onChange={(e) => update('postedWithin', e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="All">Any posted date</option>
            {POSTED_WITHIN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </>
      )}

      <input
        type="text"
        value={filters.location}
        onChange={(e) => update('location', e.target.value)}
        placeholder="Location contains..."
        aria-label="Filter by location text"
        className="w-40 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
      />

      {rightSlot && <div className="ml-auto flex items-center gap-2">{rightSlot}</div>}
    </div>
  )
}
