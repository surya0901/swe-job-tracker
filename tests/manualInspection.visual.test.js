// Not a real regression test — generates sample exports to /tmp for
// manual visual inspection (rendered PDF/DOCX, not just "did it throw").
// Run on demand: npx vitest run tests/manualInspection.visual.test.js
import { describe, it, expect } from 'vitest'
import { writeFileSync } from 'node:fs'
import { generateResumePdf } from '../src/lib/resume/pdfExport'
import { generateResumeDocx } from '../src/lib/resume/docxExport'

const resume = {
  contact: {
    name: 'Jane Doe',
    email: 'jane.doe@example.com',
    phone: '(555) 123-4567',
    links: [
      { label: 'GitHub', url: 'https://github.com/janedoe' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/janedoe' },
    ],
  },
  summary:
    'Computer Science student passionate about backend systems, distributed computing, and building reliable software that scales.',
  education: [
    { institution: 'University of Example', startDate: 'Aug 2022', endDate: 'May 2026', details: ['B.S. Computer Science, GPA 3.8'] },
  ],
  experience: [
    {
      organization: 'Acme Corp',
      title: 'Software Engineering Intern',
      startDate: 'Jun 2025',
      endDate: 'Aug 2025',
      bullets: [
        'Built a REST API in Python serving 10,000 requests/day for the internal billing dashboard',
        'Wrote unit tests with pytest, increasing test coverage from 60% to 85%',
        'Collaborated with a team of 4 engineers using Git and code review',
      ],
    },
    {
      organization: 'University Computing Lab',
      title: 'Teaching Assistant',
      startDate: 'Jan 2024',
      endDate: 'May 2024',
      bullets: ['Held weekly office hours for 50+ students in an Introduction to Algorithms course'],
    },
  ],
  projects: [
    {
      name: 'Task Tracker App',
      bullets: ['Built a full-stack task management app with React and Node.js', 'Deployed on Vercel with CI/CD via GitHub Actions'],
    },
  ],
  skills: ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git', 'Docker'],
  certifications: [{ raw: 'AWS Certified Cloud Practitioner (2025)' }],
  additionalSections: [],
}

describe('manual export inspection (writes files to /tmp)', () => {
  it('generates PDFs for both templates', async () => {
    for (const template of ['standard', 'compact']) {
      const result = await generateResumePdf(resume, { template, targetPages: 1 })
      writeFileSync(`/tmp/resume-${template}.pdf`, result.bytes)
      console.log(`${template} PDF: pages=${result.pageCount} overflowed=${result.overflowed} bytes=${result.bytes.length}`)
      expect(result.bytes.length).toBeGreaterThan(0)
    }
  })

  it('generates a DOCX', async () => {
    const blob = await generateResumeDocx(resume)
    const buffer = Buffer.from(await blob.arrayBuffer())
    writeFileSync('/tmp/resume.docx', buffer)
    console.log(`DOCX: bytes=${buffer.length}`)
    expect(buffer.length).toBeGreaterThan(0)
  })
})
