import { useState } from 'react'

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">{label}</label>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  )
}

function BulletListEditor({ bullets, onChange }) {
  const update = (i, value) => onChange(bullets.map((b, idx) => (idx === i ? value : b)))
  const remove = (i) => onChange(bullets.filter((_, idx) => idx !== i))
  const add = () => onChange([...bullets, ''])
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {bullets.map((b, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 text-zinc-600">•</span>
          <textarea
            value={b}
            onChange={(e) => update(i, e.target.value)}
            rows={1}
            className="flex-1 resize-none rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          />
          <button onClick={() => remove(i)} className="mt-1.5 text-xs text-red-400 hover:text-red-300">
            Remove
          </button>
        </div>
      ))}
      <button onClick={add} className="self-start text-xs text-indigo-400 hover:text-indigo-300">
        + Add bullet
      </button>
    </div>
  )
}

export default function ResumeSectionEditor({ resume, onChange, warnings = [] }) {
  const [openSections, setOpenSections] = useState(new Set(['contact', 'experience']))
  const toggle = (key) =>
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

  const update = (patch) => onChange({ ...resume, ...patch })

  const updateExperience = (index, patch) =>
    update({ experience: resume.experience.map((e, i) => (i === index ? { ...e, ...patch } : e)) })
  const addExperience = () =>
    update({
      experience: [...resume.experience, { organization: '', title: '', startDate: '', endDate: '', bullets: [''] }],
    })
  const removeExperience = (index) => update({ experience: resume.experience.filter((_, i) => i !== index) })

  const updateProject = (index, patch) =>
    update({ projects: resume.projects.map((p, i) => (i === index ? { ...p, ...patch } : p)) })
  const addProject = () => update({ projects: [...resume.projects, { name: '', bullets: [''] }] })
  const removeProject = (index) => update({ projects: resume.projects.filter((_, i) => i !== index) })

  const updateEducation = (index, patch) =>
    update({ education: resume.education.map((e, i) => (i === index ? { ...e, ...patch } : e)) })
  const addEducation = () =>
    update({ education: [...resume.education, { institution: '', startDate: '', endDate: '', details: [''] }] })
  const removeEducation = (index) => update({ education: resume.education.filter((_, i) => i !== index) })

  return (
    <div className="flex flex-col gap-3">
      {warnings.length > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          <p className="font-medium">Low-confidence extraction — please review:</p>
          <ul className="mt-1 list-inside list-disc">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <Section title="Contact" isOpen={openSections.has('contact')} onToggle={() => toggle('contact')}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Name" value={resume.contact.name} onChange={(v) => update({ contact: { ...resume.contact, name: v } })} />
          <Field label="Email" value={resume.contact.email} onChange={(v) => update({ contact: { ...resume.contact, email: v } })} />
          <Field label="Phone" value={resume.contact.phone} onChange={(v) => update({ contact: { ...resume.contact, phone: v } })} />
        </div>
        {(resume.contact.links ?? []).map((link, i) => (
          <div key={i} className="mt-2 flex gap-2">
            <Field
              label={`Link ${i + 1}`}
              value={link.url}
              onChange={(v) =>
                update({
                  contact: { ...resume.contact, links: resume.contact.links.map((l, idx) => (idx === i ? { ...l, url: v } : l)) },
                })
              }
            />
          </div>
        ))}
      </Section>

      <Section title="Summary (optional)" isOpen={openSections.has('summary')} onToggle={() => toggle('summary')}>
        <textarea
          value={resume.summary ?? ''}
          onChange={(e) => update({ summary: e.target.value })}
          rows={3}
          className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
        />
      </Section>

      <Section title={`Experience (${resume.experience.length})`} isOpen={openSections.has('experience')} onToggle={() => toggle('experience')}>
        {resume.experience.map((e, i) => (
          <div key={i} className="mb-3 rounded-md border border-zinc-800 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Organization" value={e.organization} onChange={(v) => updateExperience(i, { organization: v })} />
              <Field label="Title" value={e.title} onChange={(v) => updateExperience(i, { title: v })} />
              <Field label="Start date" value={e.startDate} onChange={(v) => updateExperience(i, { startDate: v })} />
              <Field label="End date" value={e.endDate} onChange={(v) => updateExperience(i, { endDate: v })} />
            </div>
            <BulletListEditor bullets={e.bullets} onChange={(bullets) => updateExperience(i, { bullets })} />
            <button onClick={() => removeExperience(i)} className="mt-2 text-xs text-red-400 hover:text-red-300">
              Remove this entry
            </button>
          </div>
        ))}
        <button onClick={addExperience} className="text-xs text-indigo-400 hover:text-indigo-300">
          + Add experience entry
        </button>
      </Section>

      <Section title={`Projects (${resume.projects.length})`} isOpen={openSections.has('projects')} onToggle={() => toggle('projects')}>
        {resume.projects.map((p, i) => (
          <div key={i} className="mb-3 rounded-md border border-zinc-800 p-3">
            <Field label="Name" value={p.name} onChange={(v) => updateProject(i, { name: v })} />
            <BulletListEditor bullets={p.bullets} onChange={(bullets) => updateProject(i, { bullets })} />
            <button onClick={() => removeProject(i)} className="mt-2 text-xs text-red-400 hover:text-red-300">
              Remove this project
            </button>
          </div>
        ))}
        <button onClick={addProject} className="text-xs text-indigo-400 hover:text-indigo-300">
          + Add project
        </button>
      </Section>

      <Section title={`Education (${resume.education.length})`} isOpen={openSections.has('education')} onToggle={() => toggle('education')}>
        {resume.education.map((e, i) => (
          <div key={i} className="mb-3 rounded-md border border-zinc-800 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Field label="Institution" value={e.institution} onChange={(v) => updateEducation(i, { institution: v })} />
              <Field label="Start date" value={e.startDate} onChange={(v) => updateEducation(i, { startDate: v })} />
              <Field label="End date" value={e.endDate} onChange={(v) => updateEducation(i, { endDate: v })} />
            </div>
            <BulletListEditor bullets={e.details ?? []} onChange={(details) => updateEducation(i, { details })} />
            <button onClick={() => removeEducation(i)} className="mt-2 text-xs text-red-400 hover:text-red-300">
              Remove
            </button>
          </div>
        ))}
        <button onClick={addEducation} className="text-xs text-indigo-400 hover:text-indigo-300">
          + Add education entry
        </button>
      </Section>

      <Section title="Skills" isOpen={openSections.has('skills')} onToggle={() => toggle('skills')}>
        <textarea
          value={resume.skills.join(', ')}
          onChange={(e) => update({ skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          rows={2}
          placeholder="Comma-separated: Python, React, SQL..."
          className="w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
        />
      </Section>
    </div>
  )
}

function Section({ title, isOpen, onToggle, children }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-zinc-200"
      >
        {title}
        <span className="text-zinc-500">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="border-t border-zinc-800 p-3">{children}</div>}
    </div>
  )
}
