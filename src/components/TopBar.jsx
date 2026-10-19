import { STALE_THRESHOLD_MS } from '../lib/constants'

const VIEWS = [
  { key: 'openings', label: 'Openings' },
  { key: 'tracker', label: 'Tracker' },
  { key: 'alerts', label: 'Alerts' },
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
    <header className="border-b border-zinc-700 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              Early-career software &amp; tech ops
            </p>
            <h1 className="mt-1.5 text-[34px] font-medium leading-[1.1] text-zinc-50">
              SWE New Grad &amp; Rotational Program Tracker
            </h1>
            {meta && stats && (
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                <span className="font-medium text-zinc-200">{stats.matchingJobs}</span> open postings across{' '}
                <span className="font-medium text-zinc-200">{stats.employersWithOpenings}</span> employers,{' '}
                <span className="font-medium text-zinc-200">{meta.counts.supportedEarlyCareerJobs}</span> clearly
                early-career.
                {(activeView === 'openings' || activeView === 'tracker') && ` ${stats.resultsAfterFilters} shown with current filters.`}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-1">
            <button
              onClick={onAddCompany}
              className="rounded-full border border-zinc-700 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              Add company
            </button>
            <button
              onClick={onExport}
              className="rounded-full border border-zinc-700 px-3.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
            >
              Export CSV
            </button>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Downloads the latest already-collected dataset. It does not start a new web crawl from your browser."
              className="flex items-center gap-2 rounded-full bg-zinc-50 px-4 py-1.5 text-xs font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing && (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-zinc-950" />
              )}
              {refreshing ? 'Downloading...' : 'Refresh Openings'}
            </button>
          </div>
        </div>

        <nav className="mt-7 flex gap-7" aria-label="Sections">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              aria-current={activeView === v.key ? 'page' : undefined}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium transition ${
                activeView === v.key
                  ? 'border-zinc-50 text-zinc-50'
                  : 'border-transparent text-zinc-500 hover:text-zinc-200'
              }`}
            >
              {v.label}
            </button>
          ))}
        </nav>
      </div>

      {meta && (
        <div className="border-t border-zinc-800 bg-zinc-900">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-1 px-6 py-2 text-[11px] text-zinc-500">
            <span>Last collection run: {formatRelative(meta.lastRunAt)}</span>
            <span>Last successful publish: {formatRelative(meta.lastSuccessAt)}</span>
            <span>{meta.counts.manualCompanies} need manual verification</span>
            <span>{meta.counts.failingCompanies} sources currently failing</span>
            <a
              href="https://github.com/surya0901/swe-job-tracker/actions/workflows/deploy.yml"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 underline-offset-2 hover:underline"
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
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                }`}
              >
                {refreshMessage.text}
              </span>
            )}
          </div>
        </div>
      )}
    </header>
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
