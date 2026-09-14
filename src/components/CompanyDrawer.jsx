import { useEffect, useState } from 'react'
import { STATUSES } from '../data/seedCompanies'
import { buildPrepLinks } from '../lib/prepLinks'
import StatusBadge from './StatusBadge'

export default function CompanyDrawer({ company, onClose, onUpdate, onDelete }) {
  const [notes, setNotes] = useState(company?.notes ?? '')
  const [url, setUrl] = useState(company?.url ?? '')

  useEffect(() => {
    setNotes(company?.notes ?? '')
    setUrl(company?.url ?? '')
  }, [company])

  if (!company) return null

  const links = buildPrepLinks(company.name)

  const commitNotes = () => onUpdate(company.id, { notes })
  const commitUrl = () => onUpdate(company.id, { url })

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
            <h2 className="text-xl font-semibold text-zinc-50">{company.name}</h2>
            <p className="text-sm text-zinc-400">{company.programName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>{company.industry}</span>
          <span>·</span>
          <span>{company.programType}</span>
          <span>·</span>
          <span>{company.location}</span>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Status
          </label>
          <select
            value={company.status}
            onChange={(e) => onUpdate(company.id, { status: e.target.value })}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <StatusBadge status={company.status} />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Job posting URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={commitUrl}
            placeholder="https://..."
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="mt-6 border-t border-zinc-800 pt-4">
          <h3 className="text-sm font-semibold text-zinc-200">Interview Prep</h3>
          <div className="mt-3 flex flex-col gap-2">
            <PrepLink
              label="Search OA questions on GitHub"
              sublabel="perixtar/Tech-OA-Interview-Questions"
              href={links.githubOA}
            />
            <PrepLink
              label="Glassdoor interview reviews"
              sublabel="glassdoor.com"
              href={links.glassdoor}
            />
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
            onDelete(company.id)
            onClose()
          }}
          className="mt-6 self-start text-xs font-medium text-red-400 hover:text-red-300"
        >
          Remove from tracker
        </button>
      </div>
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
