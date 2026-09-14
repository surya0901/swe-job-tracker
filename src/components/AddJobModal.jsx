import { useState } from 'react'
import { PROGRAM_TYPES } from '../lib/constants'

const EMPTY = {
  companyName: '',
  title: '',
  industry: '',
  programType: 'Rotational',
  location: '',
  applyUrl: '',
}

export default function AddJobModal({ onClose, onAdd }) {
  const [form, setForm] = useState(EMPTY)

  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.companyName.trim()) return
    onAdd(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
      >
        <h2 className="text-lg font-semibold text-zinc-50">Add Company / Job</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Manually added entries are marked "unverified" — they aren't part of the collected
          dataset, just your own note.
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <Field label="Company name" value={form.companyName} onChange={(v) => update('companyName', v)} required />
          <Field label="Job / program title" value={form.title} onChange={(v) => update('title', v)} />
          <Field label="Industry" value={form.industry} onChange={(v) => update('industry', v)} />
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Program Type
            </label>
            <select
              value={form.programType}
              onChange={(e) => update('programType', e.target.value)}
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
            >
              {PROGRAM_TYPES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <Field label="Location" value={form.location} onChange={(v) => update('location', v)} />
          <Field label="Job posting URL" value={form.applyUrl} onChange={(v) => update('applyUrl', v)} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, required }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  )
}
