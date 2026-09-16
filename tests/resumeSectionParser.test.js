import { describe, it, expect } from 'vitest'
import { parseResumeText } from '../src/lib/resume/sectionParser'

const SAMPLE = `Jane Doe
jane.doe@email.com | (555) 123-4567 | linkedin.com/in/janedoe | github.com/janedoe

SUMMARY
Computer Science student passionate about backend systems.

EDUCATION
University of Example
Aug 2022 - May 2026
B.S. Computer Science, GPA 3.8

EXPERIENCE
Acme Corp — Software Engineering Intern
Jun 2025 - Aug 2025
- Built a REST API in Python serving 10k requests/day
- Wrote unit tests with pytest, increasing coverage to 85%
Beta Inc — Teaching Assistant
Jan 2024 - May 2024
- Held office hours for 50+ students

PROJECTS
Task Tracker App
- Built with React and Node.js
- Deployed on Vercel

SKILLS
Python, JavaScript, React, Node.js, SQL, Git

CERTIFICATIONS
AWS Certified Cloud Practitioner
`

describe('parseResumeText: preserves core facts', () => {
  const result = parseResumeText(SAMPLE)

  it('extracts name, email, phone, and links without inventing any', () => {
    expect(result.contact.name).toBe('Jane Doe')
    expect(result.contact.email).toBe('jane.doe@email.com')
    expect(result.contact.phone).toBe('(555) 123-4567')
    expect(result.contact.links.map((l) => l.label).sort()).toEqual(['GitHub', 'LinkedIn'])
  })

  it('splits Experience into distinct entries, not merged into one', () => {
    expect(result.experience).toHaveLength(2)
    expect(result.experience[0].organization).toBe('Acme Corp')
    expect(result.experience[1].organization).toBe('Beta Inc')
  })

  it('preserves employer, title, and dates for each experience entry', () => {
    const [first] = result.experience
    expect(first.organization).toBe('Acme Corp')
    expect(first.title).toBe('Software Engineering Intern')
    expect(first.startDate).toBe('Jun 2025')
    expect(first.endDate).toBe('Aug 2025')
  })

  it('preserves original bullet text verbatim, not paraphrased', () => {
    expect(result.experience[0].bullets).toContain('Built a REST API in Python serving 10k requests/day')
    expect(result.experience[0].bullets).toContain('Wrote unit tests with pytest, increasing coverage to 85%')
  })

  it('preserves a metric already present in a bullet (85% coverage) exactly', () => {
    const bulletWithMetric = result.experience[0].bullets.find((b) => b.includes('85%'))
    expect(bulletWithMetric).toBeDefined()
  })

  it('parses education with institution, degree details, and dates kept separate', () => {
    expect(result.education).toHaveLength(1)
    expect(result.education[0].institution).toBe('University of Example')
    expect(result.education[0].details).toContain('B.S. Computer Science, GPA 3.8')
    expect(result.education[0].startDate).toBe('Aug 2022')
  })

  it('parses skills as a clean list', () => {
    expect(result.skills).toEqual(['Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git'])
  })

  it('preserves section ordering as encountered (summary before education before experience)', () => {
    // rawText is the untouched source of truth — section order is
    // whatever the original document had, never reordered by the parser.
    const summaryIdx = result.rawText.indexOf('SUMMARY')
    const educationIdx = result.rawText.indexOf('EDUCATION')
    const experienceIdx = result.rawText.indexOf('EXPERIENCE')
    expect(summaryIdx).toBeLessThan(educationIdx)
    expect(educationIdx).toBeLessThan(experienceIdx)
  })

  it('flags high confidence when all expected sections are found', () => {
    expect(result.confidence).toBe('high')
    expect(result.warnings).toHaveLength(0)
  })
})

describe('parseResumeText: honest low-confidence flagging', () => {
  it('flags missing sections instead of inventing content', () => {
    const sparse = 'Someone Somewhere\n\nEXPERIENCE\n- did some stuff once'
    const result = parseResumeText(sparse)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.confidence).not.toBe('high')
    // Never fabricates an email/skills list that wasn't there.
    expect(result.contact.email).toBeNull()
    expect(result.skills).toEqual([])
  })
})
