import { describePosted, formatExactDate } from '../lib/formatDate'

export default function JobCard({ job, onOpen, onDragStart, isNew }) {
  const posted = describePosted(job)
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => onDragStart(e, job.id)}
      onClick={() => onOpen(job)}
      className="w-full cursor-grab rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800/80 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-zinc-100">{job.companyName}</p>
        <div className="flex shrink-0 items-center gap-1">
          {isNew && (
            <span className="rounded border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              New
            </span>
          )}
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
              job.programType === 'Rotational'
                ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300'
                : 'border-zinc-600/40 bg-zinc-700/30 text-zinc-400'
            }`}
          >
            {job.programType}
          </span>
        </div>
      </div>
      <p className="mt-1 text-xs text-zinc-400">{job.title}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{job.industry}</span>
        <span>{job.location}</span>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-600">
        <span>
          Posted: {posted.exact ?? 'Not provided'}
          {posted.approximate && posted.exact ? ' (approx.)' : ''}
        </span>
        <span>Found: {formatExactDate(job.firstSeenAt) ?? '—'}</span>
      </div>
      {job.verified === false && (
        <span className="mt-2 inline-block rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
          Unverified / custom
        </span>
      )}
      {job.status === 'closed' && (
        <span className="mt-2 inline-block rounded border border-zinc-600/40 bg-zinc-700/30 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
          Closed
        </span>
      )}
    </button>
  )
}
