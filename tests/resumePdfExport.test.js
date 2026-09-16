import { describe, it, expect } from 'vitest'
import { generateResumePdf } from '../src/lib/resume/pdfExport'

const sampleResume = {
  contact: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '(555) 123-4567',
    links: [{ label: 'GitHub', url: 'https://github.com/janedoe' }],
  },
  summary: 'Computer Science student passionate about backend systems.',
  education: [
    {
      institution: 'University of Example',
      startDate: 'Aug 2022',
      endDate: 'May 2026',
      details: ['B.S. Computer Science, GPA 3.8'],
    },
  ],
  experience: [
    {
      organization: 'Acme Corp',
      title: 'Software Engineering Intern',
      startDate: 'Jun 2025',
      endDate: 'Aug 2025',
      bullets: ['Built a REST API in Python serving 10k requests/day', 'Wrote unit tests with pytest'],
    },
  ],
  projects: [{ name: 'Task Tracker App', bullets: ['Built with React and Node.js'] }],
  skills: ['Python', 'JavaScript', 'React'],
  certifications: [{ raw: 'AWS Certified Cloud Practitioner' }],
  additionalSections: [],
}

describe('generateResumePdf', () => {
  it('produces a real PDF (starts with the %PDF magic bytes)', async () => {
    const { bytes } = await generateResumePdf(sampleResume, { template: 'standard' })
    const header = new TextDecoder().decode(bytes.slice(0, 5))
    expect(header).toBe('%PDF-')
  })

  it('fits a short resume on one page and reports no overflow', async () => {
    const result = await generateResumePdf(sampleResume, { template: 'standard', targetPages: 1 })
    expect(result.pageCount).toBe(1)
    expect(result.overflowed).toBe(false)
  })

  it('reports overflow honestly when content exceeds the target page count', async () => {
    const longResume = {
      ...sampleResume,
      experience: Array.from({ length: 15 }, (_, i) => ({
        organization: `Company ${i}`,
        title: 'Software Engineer',
        startDate: '2024',
        endDate: '2025',
        bullets: Array.from({ length: 6 }, (_, j) => `Did substantial engineering work item number ${j} with real technical depth and detail.`),
      })),
    }
    const result = await generateResumePdf(longResume, { template: 'standard', targetPages: 1 })
    expect(result.pageCount).toBeGreaterThan(1)
    expect(result.overflowed).toBe(true)
  })

  it('both templates produce valid, non-empty output', async () => {
    for (const template of ['standard', 'compact']) {
      const { bytes, pageCount } = await generateResumePdf(sampleResume, { template })
      expect(bytes.length).toBeGreaterThan(500)
      expect(pageCount).toBeGreaterThanOrEqual(1)
    }
  })
})
