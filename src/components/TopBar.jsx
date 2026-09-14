export default function TopBar({
  activeView,
  onViewChange,
  onRefresh,
  refreshing,
  onExport,
  onAddCompany,
  count,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-6 py-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-50">
          SWE New Grad &amp; Rotational Program Tracker
        </h1>
        <p className="text-xs text-zinc-500">{count} companies tracked</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="mr-2 flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
          {['tracker', 'resume'].map((v) => (
            <button
              key={v}
              onClick={() => onViewChange(v)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                activeView === v
                  ? 'bg-indigo-500 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {v === 'tracker' ? 'Tracker' : 'Resume Assistant'}
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
          className="flex items-center gap-2 rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-indigo-500/50"
        >
          {refreshing && (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {refreshing ? 'Refreshing...' : 'Refresh Openings'}
        </button>
      </div>
    </div>
  )
}
