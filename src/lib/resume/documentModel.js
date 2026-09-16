// Converts a structured resume into a flat list of layout-agnostic
// blocks that both the PDF and DOCX exporters render from — this is what
// keeps the two output formats showing the same content instead of
// drifting apart as two separate hand-written templates.
//
// Block types: sectionHeading, entryHeader (text + optional right-aligned
// date), entryDetail (sub-line, e.g. a degree), bullet, text (plain
// paragraph), contact (name/email/phone/links line).

function formatDateRange(start, end) {
  if (!start && !end) return ''
  if (start && end) return `${start} – ${end}`
  return start || end
}

export function buildResumeBlocks(resume, { sectionOrder } = {}) {
  const blocks = []

  blocks.push({ type: 'name', text: resume.contact?.name || 'Untitled Resume' })
  const contactParts = [
    resume.contact?.email,
    resume.contact?.phone,
    ...(resume.contact?.links ?? []).map((l) => l.url.replace(/^https?:\/\//, '')),
  ].filter(Boolean)
  if (contactParts.length) blocks.push({ type: 'contact', text: contactParts.join('  |  ') })

  const sectionRenderers = {
    summary: () => {
      if (!resume.summary) return
      blocks.push({ type: 'sectionHeading', text: 'Summary' })
      blocks.push({ type: 'text', text: resume.summary })
    },
    experience: () => {
      if (!resume.experience?.length) return
      blocks.push({ type: 'sectionHeading', text: 'Experience' })
      for (const e of resume.experience) {
        const header = [e.organization, e.title].filter(Boolean).join(' — ')
        blocks.push({ type: 'entryHeader', text: header, right: formatDateRange(e.startDate, e.endDate) })
        for (const bullet of e.bullets ?? []) {
          blocks.push({ type: 'bullet', text: bullet })
        }
      }
    },
    projects: () => {
      if (!resume.projects?.length) return
      blocks.push({ type: 'sectionHeading', text: 'Projects' })
      for (const p of resume.projects) {
        blocks.push({ type: 'entryHeader', text: p.name, right: '' })
        for (const bullet of p.bullets ?? []) {
          blocks.push({ type: 'bullet', text: bullet })
        }
      }
    },
    education: () => {
      if (!resume.education?.length) return
      blocks.push({ type: 'sectionHeading', text: 'Education' })
      for (const e of resume.education) {
        blocks.push({ type: 'entryHeader', text: e.institution, right: formatDateRange(e.startDate, e.endDate) })
        for (const detail of e.details ?? []) {
          blocks.push({ type: 'entryDetail', text: detail })
        }
      }
    },
    skills: () => {
      if (!resume.skills?.length) return
      blocks.push({ type: 'sectionHeading', text: 'Skills' })
      blocks.push({ type: 'text', text: resume.skills.join(', ') })
    },
    certifications: () => {
      if (!resume.certifications?.length) return
      blocks.push({ type: 'sectionHeading', text: 'Certifications' })
      for (const c of resume.certifications) {
        blocks.push({ type: 'bullet', text: c.raw })
      }
    },
    additional: () => {
      for (const s of resume.additionalSections ?? []) {
        blocks.push({ type: 'sectionHeading', text: s.heading })
        blocks.push({ type: 'text', text: s.content })
      }
    },
  }

  const order = sectionOrder ?? ['summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'additional']
  for (const key of order) {
    sectionRenderers[key]?.()
  }

  return blocks
}
