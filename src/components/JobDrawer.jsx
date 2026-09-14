import { useEffect, useState } from 'react'
import { STATUSES } from '../lib/constants'
import { buildPrepLinks } from '../lib/prepLinks'
import { formatExactDate } from '../lib/formatDate'
import StatusBadge from './StatusBadge'

const ELIGIBILITY_LABELS = {
  rotational_tdp: 'Rotational/TDP',
  explicit_new_grad: 'Explicit new grad',
  entry_level: 'Entry level',
  possibly_eligible: 'Possibly eligible — review requirements',
}

function provenanceLabel(provenance) {
  switch (provenance) {
    case 'platform_published':
      return 'source platform publish time'
    case 'platform_created':
      return 'source platform creation time'
    case 'relative_text_parsed':
      return 'parsed from relative text'
    default:
      return 'approximate'
  }
}

export default function JobDrawer({ job, onClose, onUpdate, onRemove }) {
  const [notes, setNotes] = useState(job?.notes ?? '')

  useEffect(() => {
    setNotes(job?.notes ?? '')
  }, [job])

  if (!job) return null

  const links = buildPrepLinks(job.companyName)
  const commitNotes = () => onUpdate(job.id, { notes })

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-zinc-50">{job.companyName}</h2>
            <p className="text-sm text-zinc-400">{job.title}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>{job.industry}</span>
          <span>·</span>
          <span>{job.programType}</span>
          <span>·</span>
          <span>{job.location}</span>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {job.verified === false ? (
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
              Unverified / custom entry
            </span>
          ) : (
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
              {job.status === 'closed' ? 'Was verified — now closed' : 'Verified open posting'}
            </span>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Status
          </label>
          <select
            value={job.status}
            onChange={(e) => onUpdate(job.id, { status: e.target.value })}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <StatusBadge status={job.status} />
          </div>
        </div>

        {job.applyUrl && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Application link
            </label>
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="block truncate rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-indigo-300 hover:border-indigo-500/50"
            >
              {job.applyUrl}
            </a>
          </div>
        )}

        {job.verified !== false && (
          <>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Posted</p>
              <p className="mt-1 text-sm text-zinc-200">
                {job.postedAt ? formatExactDate(job.postedAt) : 'Not provided'}
                {job.postedAt && job.postedAtProvenance !== 'employer_structured' && (
                  <span className="ml-1 text-xs text-zinc-500">
                    (approximate — {provenanceLabel(job.postedAtProvenance)}
                    {job.postedAtRawText ? `, source text: "${job.postedAtRawText}"` : ''})
                  </span>
                )}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
              <DateField label="First found by us" value={job.firstSeenAt} />
              <DateField label="Last seen" value={job.lastSeenAt} />
              <DateField label="Last checked" value={job.lastCheckedAt} />
              <DateField label="Deadline" value={job.closesAt} fallback="Not provided" />
              {job.sourceUpdatedAt && <DateField label="Source last updated" value={job.sourceUpdatedAt} />}
            </div>
            {job.eligibility && (
              <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Eligibility: {ELIGIBILITY_LABELS[job.eligibility] ?? job.eligibility}
                </p>
                <ul className="mt-1 flex flex-col gap-1 text-xs text-zinc-400">
                  {(job.eligibilityEvidence ?? []).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {job.description && (
          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Description (from source)
            </label>
            <p className="max-h-40 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-400">
              {job.description}
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold text-zinc-200">Interview Prep</h3>
          <div className="mt-3 flex flex-col gap-2">
            <PrepLink
              label="Search OA questions on GitHub"
              sublabel="perixtar/Tech-OA-Interview-Questions"
              href={links.githubOA}
            />
            <PrepLink label="Glassdoor interview reviews" sublabel="glassdoor.com" href={links.glassdoor} />
            <PrepLink
              label="LeetCode company-tagged questions"
              sublabel="leetcode.com/company"
              href={links.leetcode}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-zinc-800 pt-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={commitNotes}
            rows={5}
            placeholder="Recruiter contacts, referral info, interview rounds, follow-up dates..."
            className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          onClick={() => {
            onRemove(job.id)
            onClose()
          }}
          className="mt-6 self-start text-xs font-medium text-red-400 hover:text-red-300"
        >
          {job.verified === false ? 'Delete custom entry' : 'Remove from tracker'}
        </button>
      </div>
    </div>
  )
}

function DateField({ label, value, fallback = 'Unknown' }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-2">
      <p className="uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-0.5 text-zinc-300">{value ? formatExactDate(value) : fallback}</p>
    </div>
  )
}

function PrepLink({ label, sublabel, href }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition hover:border-indigo-500/50 hover:bg-zinc-800"
    >
      <span>
        {label}
        <span className="block text-xs text-zinc-500">{sublabel}</span>
      </span>
      <span className="text-zinc-500">↗</span>
    </a>
  )
}
