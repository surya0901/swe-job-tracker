import { useMemo } from 'react'
import { isAlertWorthy } from '../../scripts/lib/alerts.mjs'
import { formatExactDate } from '../lib/formatDate'

const REPO = 'surya0901/swe-job-tracker'

function relativeAge(iso) {
  if (!iso) return ''
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)}m ago`
  const hours = Math.round(mins / 60)
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`
}

export default function AlertsView({ companies, jobs }) {
  const { watched, failing, manual, recent } = useMemo(() => {
    const top = companies.filter((c) => c.isTopCompany)
    return {
      watched: top.filter((c) => c.status === 'connected'),
      failing: top.filter((c) => c.status === 'source_failing'),
      manual: top.filter((c) => c.status === 'manual_verification_needed'),
      recent: jobs
        .filter((j) => isAlertWorthy(j))
        .sort((a, b) => new Date(b.firstSeenAt) - new Date(a.firstSeenAt))
        .slice(0, 12),
    }
  }, [companies, jobs])

  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-12">
        <section>
          <h2 className="text-2xl font-medium text-zinc-50">What would alert you</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            A role must be at one of the top-tier companies, open and full-time, a software or tech-ops
            discipline we are confident about, and carry a real early-career signal: a new-grad or
            rotational-program posting, or an entry-level title. Generic software roles with no such signal
            appear on the Openings page but do not trigger an alert, to keep the alerts worth opening.
          </p>
        </section>

        <section>
          <div className="flex items-baseline justify-between border-b border-zinc-700 pb-2">
            <h2 className="text-2xl font-medium text-zinc-50">Most recent qualifying roles</h2>
            <span className="text-xs text-zinc-500">what an alert would have said</span>
          </div>
          {recent.length === 0 ? (
            <p className="py-6 text-sm text-zinc-500">No qualifying roles in the current dataset yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {recent.map((j) => (
                <li key={j.id} className="flex items-start justify-between gap-6 py-3.5">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-zinc-100">
                      {j.companyName}
                      <span className="font-normal text-zinc-400"> — {j.title}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {j.roleFamily === 'tech_ops' ? 'Tech ops' : 'Software'} · {j.location} · found{' '}
                      {formatExactDate(j.firstSeenAt)} ({relativeAge(j.firstSeenAt)})
                    </p>
                  </div>
                  <a
                    href={j.applyUrl || j.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm font-medium text-indigo-400 underline-offset-2 hover:underline"
                  >
                    Apply ↗
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="border-b border-zinc-700 pb-2 text-2xl font-medium text-zinc-50">Turn on alerts</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Alerts are sent by the watcher, which runs outside your browser. Add these as repository secrets at{' '}
            <a
              className="text-indigo-400 underline-offset-2 hover:underline"
              href={`https://github.com/${REPO}/settings/secrets/actions`}
              target="_blank"
              rel="noreferrer"
            >
              Settings → Secrets → Actions
            </a>
            . Either channel works on its own.
          </p>
          <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <dt className="font-medium text-zinc-100">Email</dt>
              <dd className="mt-2 leading-relaxed text-zinc-400">
                Free <a className="text-indigo-400 hover:underline" href="https://resend.com" target="_blank" rel="noreferrer">Resend</a> account,
                create an API key, then add <code className="rounded bg-zinc-800 px-1 text-[12px]">RESEND_API_KEY</code> and{' '}
                <code className="rounded bg-zinc-800 px-1 text-[12px]">ALERT_EMAIL_TO</code> (your address). Without a verified
                domain Resend only delivers to the address that owns the account.
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <dt className="font-medium text-zinc-100">Phone push</dt>
              <dd className="mt-2 leading-relaxed text-zinc-400">
                Install the free <a className="text-indigo-400 hover:underline" href="https://ntfy.sh" target="_blank" rel="noreferrer">ntfy</a> app,
                subscribe to a long random topic name, and add it as the{' '}
                <code className="rounded bg-zinc-800 px-1 text-[12px]">NTFY_TOPIC</code> secret. No account needed, and the
                notification opens the apply page directly.
              </dd>
            </div>
          </dl>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-500">
            Timing, honestly: the GitHub watcher is scheduled every 5 minutes, but GitHub treats schedules as
            best-effort and often delays them, so expect minutes, not seconds. The Cloudflare Worker in{' '}
            <code className="rounded bg-zinc-800 px-1 text-[12px]">server/job-alerts</code> checks every minute and is the way to
            get close to a one-minute lead. Both can only see a posting once the employer's own feed lists it.
          </p>
        </section>
      </div>

      <aside className="flex flex-col gap-8">
        <section>
          <h2 className="border-b border-zinc-700 pb-2 text-lg font-medium text-zinc-50">
            Watched live <span className="font-sans text-sm text-zinc-500">· {watched.length}</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{watched.map((c) => c.name).join(', ') || 'None yet.'}</p>
        </section>

        {failing.length > 0 && (
          <section>
            <h2 className="border-b border-zinc-700 pb-2 text-lg font-medium text-zinc-50">
              Feed currently failing <span className="font-sans text-sm text-zinc-500">· {failing.length}</span>
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">{failing.map((c) => c.name).join(', ')}</p>
          </section>
        )}

        <section>
          <h2 className="border-b border-zinc-700 pb-2 text-lg font-medium text-zinc-50">
            Cannot be watched <span className="font-sans text-sm text-zinc-500">· {manual.length}</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            These have no public job feed we could verify, so no alert can fire for them. Check their careers pages
            directly.
          </p>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {manual.map((c) => (
              <li key={c.companyId}>
                {c.careersUrl ? (
                  <a className="text-zinc-200 underline-offset-2 hover:underline" href={c.careersUrl} target="_blank" rel="noreferrer">
                    {c.name} ↗
                  </a>
                ) : (
                  c.name
                )}
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  )
}
