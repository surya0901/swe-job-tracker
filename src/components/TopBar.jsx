import { STALE_THRESHOLD_MS } from '../lib/constants'

const VIEWS = [
  { key: 'tracker', label: 'Tracker' },
  { key: 'openings', label: 'Openings' },
  { key: 'directory', label: 'Directory' },
  { key: 'resume', label: 'Resume' },
]

export default function TopBar({
  activeView,
  onViewChange,
  onRefresh,
  refreshing,
  refreshError,
  refreshMessage,
  onExport,
  onAddCompany,
  meta,
  stats,
}) {
  const isStale =
    meta?.lastSuccessAt && Date.now() - new Date(meta.lastSuccessAt).getTime() > STALE_THRESHOLD_MS

  return (
    <div className="border-b border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-zinc-50">
            SWE New Grad &amp; Rotational Program Tracker
          </h1>
          {meta && stats && (
            <>
              <p className="text-xs text-zinc-500">
                {stats.matchingJobs} open postings at {stats.employersWithOpenings} employers
                {' · '}
                {meta.counts.connectedCompanies} connected ({meta.counts.fullyCheckedCompanies} fully checked,{' '}
                {meta.counts.partiallyCheckedCompanies} partial) / {meta.counts.totalCompanies} researched
                {' · '}
                {stats.resultsAfterFilters} shown after current filters
              </p>
              <p className="text-xs text-zinc-600">
                {meta.counts.supportedEarlyCareerJobs} supported early-career matches
                {' · '}
                {meta.counts.uncertainJobs} uncertain (needs review)
                {' · '}
                {meta.counts.softwareRotationalJobs} confirmed software rotational programs
              </p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-2 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                onClick={() => onViewChange(v.key)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition focus:outline focus:outline-2 focus:outline-indigo-400 ${
                  activeView === v.key
                    ? 'bg-indigo-500 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <button
            onClick={onAddCompany}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            + Add Company
          </button>

          <button
            onClick={onExport}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-800"
          >
            Export CSV
          </button>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="Downloads the latest already-collected dataset. It does not start a new web crawl from your browser."
            className="flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-500/50"
          >
            {refreshing && (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            )}
            {refreshing ? 'Downloading...' : 'Refresh Openings'}
          </button>
        </div>
      </div>

      {meta && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-900 px-6 py-1.5 text-[11px] text-zinc-500">
          <span>Last collection run: {formatRelative(meta.lastRunAt)}</span>
          <span>Last successful publish: {formatRelative(meta.lastSuccessAt)}</span>
          <span>{meta.counts.manualCompanies} need manual verification</span>
          <span>{meta.counts.failingCompanies} sources currently failing</span>
          <a
            href="https://github.com/surya0901/swe-job-tracker/actions/workflows/deploy.yml"
            target="_blank"
            rel="noreferrer"
            className="text-indigo-400 hover:underline"
          >
            Run collection manually (owner) ↗
          </a>
          {isStale && (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-300">
              Data may be stale — scheduled runs are not a timing guarantee
            </span>
          )}
          {refreshError && (
            <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-medium text-red-300">
              Refresh failed: {refreshError}
            </span>
          )}
          {refreshMessage && !refreshError && (
            <span
              className={`rounded border px-1.5 py-0.5 font-medium ${
                refreshMessage.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-zinc-600/40 bg-zinc-700/30 text-zinc-400'
              }`}
            >
              {refreshMessage.text}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function formatRelative(iso) {
  if (!iso) return 'never'
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}
