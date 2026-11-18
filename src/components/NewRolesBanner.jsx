import { useState } from 'react'

// Shows roles that appeared since the last visit (or while the page has
// been open), split by page, with direct apply links. Browser
// notifications are opt in and only fire while a tab is open.
export default function NewRolesBanner({ jobs, onOpen, onDismiss, onShowPage }) {
  const [perm, setPerm] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  if (!jobs.length) return null
  const big = jobs.filter((j) => j.isTopCompany)
  const small = jobs.filter((j) => !j.isTopCompany)
  const shown = [...big, ...small].slice(0, 6)

  const ask = async () => {
    try {
      setPerm(await Notification.requestPermission())
    } catch {
      setPerm('denied')
    }
  }

  return (
    <section
      role="status"
      className="mb-6 rounded-xl border border-emerald-400/30 bg-emerald-400/[0.06] px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-medium text-zinc-50">
            {jobs.length} new role{jobs.length === 1 ? '' : 's'} since you last looked
          </h2>
          <p className="mt-0.5 text-sm text-zinc-400">
            <button onClick={() => onShowPage('big')} className="underline-offset-2 hover:text-zinc-100 hover:underline">
              {big.length} at big companies
            </button>
            {' and '}
            <button onClick={() => onShowPage('newgrad')} className="underline-offset-2 hover:text-zinc-100 hover:underline">
              {small.length} new grad elsewhere
            </button>
            . Apply early, these fill fast.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {perm === 'default' && (
            <button
              onClick={ask}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium text-zinc-300 hover:text-zinc-50"
            >
              Turn on desktop alerts
            </button>
          )}
          <button
            onClick={onDismiss}
            className="rounded-full px-3 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-50"
          >
            Mark all seen
          </button>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-zinc-800/80">
        {shown.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <button onClick={() => onOpen(j)} className="min-w-0 text-left">
              <span className="font-medium text-zinc-100">{j.companyName}</span>
              <span className="text-zinc-400"> {j.title}</span>
              <span className="block text-xs text-zinc-500">{j.location}</span>
            </button>
            {j.applyUrl && (
              <a
                href={j.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-950 hover:bg-white"
              >
                Apply
              </a>
            )}
          </li>
        ))}
      </ul>
      {jobs.length > shown.length && (
        <p className="mt-2 text-xs text-zinc-500">
          {jobs.length - shown.length} more are marked New in the lists below.
        </p>
      )}
    </section>
  )
}
