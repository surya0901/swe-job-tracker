import { STATUSES } from '../lib/constants'
import { describePosted, formatExactDate } from '../lib/formatDate'

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Rotational/TDP first' },
  { value: 'posted', label: 'Recently posted' },
  { value: 'firstSeen', label: 'Newest discovered' },
  { value: 'closesAt', label: 'Deadline soonest' },
  { value: 'company', label: 'Company (A-Z)' },
  { value: 'title', label: 'Title (A-Z)' },
]

const ELIGIBILITY_LABELS = {
  rotational_tdp: 'Rotational/TDP',
  explicit_new_grad: 'New grad',
  entry_level: 'Entry level',
  possibly_eligible: 'Review requirements',
}

export default function JobTable({
  jobs,
  totalCount,
  onOpen,
  onStatusChange,
  showTrackAction = false,
  onTrack,
  sortKey,
  onSortChange,
  page,
  pageSize,
  onPageChange,
  newJobIds,
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          Showing {jobs.length ? (page - 1) * pageSize + 1 : 0}-
          {(page - 1) * pageSize + jobs.length} of {totalCount}
        </span>
        <label className="flex items-center gap-2">
          Sort by
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Company</th>
              <th scope="col" className="px-4 py-3 font-medium">Title</th>
              <th scope="col" className="px-4 py-3 font-medium">Eligibility</th>
              <th scope="col" className="px-4 py-3 font-medium">Location</th>
              <th scope="col" className="px-4 py-3 font-medium">Posted</th>
              <th scope="col" className="px-4 py-3 font-medium">First found</th>
              <th scope="col" className="px-4 py-3 font-medium">Availability</th>
              <th scope="col" className="px-4 py-3 font-medium">{showTrackAction ? 'Action' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {jobs.map((job) => {
              const posted = describePosted(job)
              return (
                <tr
                  key={job.id}
                  className="cursor-pointer transition hover:bg-zinc-900/60 focus-within:bg-zinc-900/60"
                  onClick={() => onOpen(job)}
                >
                  <td className="px-4 py-3 font-medium text-zinc-100">
                    <button
                      onClick={() => onOpen(job)}
                      className="text-left focus:underline focus:outline-none"
                    >
                      {newJobIds?.has(job.id) && (
                        <span className="mr-1.5 rounded border border-emerald-500/30 bg-emerald-500/15 px-1 py-0.5 text-[10px] font-medium text-emerald-300">
                          New
                        </span>
                      )}
                      {job.companyName}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{job.title}</td>
                  <td className="px-4 py-3">
                    <span className="whitespace-nowrap rounded border border-zinc-700 bg-zinc-800/60 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                      {ELIGIBILITY_LABELS[job.eligibility] ?? '—'}
                    </span>
                    {job.reviewState === 'needs_review' && (
                      <span
                        title="Our assessment is uncertain here — worth a closer look"
                        className="ml-1 whitespace-nowrap rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                      >
                        Review
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{job.location}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    {posted.exact ?? 'Not provided'}
                    {posted.approximate && posted.exact && (
                      <span className="text-zinc-600"> (approx.)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{formatExactDate(job.firstSeenAt) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <AvailabilityBadge job={job} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {showTrackAction ? (
                      job.tracked ? (
                        <span className="text-xs text-emerald-400">Tracking</span>
                      ) : (
                        <button
                          onClick={() => onTrack(job.id)}
                          className="rounded-md border border-indigo-500/40 bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 focus:outline focus:outline-2 focus:outline-indigo-400"
                        >
                          + Add to tracker
                        </button>
                      )
                    ) : (
                      <select
                        aria-label={`Status for ${job.companyName} ${job.title}`}
                        value={job.status}
                        onChange={(e) => onStatusChange(job.id, e.target.value)}
                        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                </tr>
              )
            })}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-600">
                  No jobs match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="rounded-md border border-zinc-700 px-3 py-1 text-zinc-300 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="rounded-md border border-zinc-700 px-3 py-1 text-zinc-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

function AvailabilityBadge({ job }) {
  if (job.verified === false) {
    return (
      <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
        Unverified
      </span>
    )
  }
  if (job.status === 'closed') {
    return (
      <span className="rounded border border-zinc-600/40 bg-zinc-700/30 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
        Closed
      </span>
    )
  }
  return (
    <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
      Verified open
    </span>
  )
}
