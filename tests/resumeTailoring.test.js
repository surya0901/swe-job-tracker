import { describe, it, expect } from 'vitest'
import { compareResumeToJob } from '../src/lib/resume/tailoring'

const resume = {
  summary: 'Computer Science student.',
  skills: ['Python', 'Docker'],
  experience: [
    { organization: 'Acme Corp', title: 'Intern', bullets: ['Built a REST API in Python using Docker for deployment'] },
    { organization: 'Beta Inc', title: 'Volunteer', bullets: ['Organized a coding workshop for high schoolers'] },
  ],
  projects: [{ name: 'Tracker', bullets: ['Used JavaScript and React to build a dashboard'] }],
  education: [{ institution: 'State University', details: ['B.S. Computer Science'] }],
}

describe('compareResumeToJob: never fabricates support', () => {
  it('lists a skill as matched only when it literally appears in the resume', () => {
    const jd = 'Looking for a software engineer with Python and Kubernetes experience.'
    const result = compareResumeToJob(resume, jd)
    expect(result.matchedSkills).toContain('Python')
    expect(result.matchedSkills).not.toContain('Kubernetes')
    expect(result.missingSkills).toContain('Kubernetes')
  })

  it('never invents an unsupported skill as matched', () => {
    const jd = 'Requires experience with Rust and gRPC.'
    const result = compareResumeToJob(resume, jd)
    expect(result.matchedSkills).toEqual([])
    expect(result.missingSkills.sort()).toEqual(['Rust', 'gRPC'].sort())
  })

  it('every matched-skill evidence entry is a verbatim bullet from the resume', () => {
    const jd = 'Requires Python experience.'
    const result = compareResumeToJob(resume, jd)
    const evidence = result.evidenceBySkill.Python
    expect(evidence.length).toBeGreaterThan(0)
    for (const e of evidence) {
      const allBullets = [...resume.experience.flatMap((x) => x.bullets), ...resume.projects.flatMap((x) => x.bullets)]
      expect(allBullets).toContain(e.text)
    }
  })

  it('ranks experience entries by how many JD skills their own text contains', () => {
    const jd = 'Requires Python and Docker experience.'
    const result = compareResumeToJob(resume, jd)
    expect(result.experienceRelevance[0].organization).toBe('Acme Corp')
  })

  it('splits required vs preferred clauses verbatim, without rewriting them', () => {
    const jd = 'Must have a minimum of 2 years of Python experience. Docker experience is a plus.'
    const result = compareResumeToJob(resume, jd)
    expect(result.requiredClauses.some((c) => c.includes('minimum of 2 years'))).toBe(true)
    expect(result.preferredClauses.some((c) => c.includes('a plus'))).toBe(true)
  })

  it('classifies skill support into the 5-category system without inventing "differently phrased" matches', () => {
    const jd = 'Requires JavaScript and Rust.'
    const result = compareResumeToJob(resume, jd)
    const js = result.skillSupport.find((s) => s.skill === 'JavaScript')
    const rust = result.skillSupport.find((s) => s.skill === 'Rust')
    expect(js.category).toBe('supported_present') // resume literally has "JavaScript"
    expect(rust.category).toBe('not_supported')
  })

  it('recognizes a known, unambiguous synonym as "supported but differently phrased" with evidence', () => {
    const resumeWithJs = { ...resume, skills: ['JS'], experience: [{ organization: 'X', bullets: ['Wrote frontend code in JS'] }], projects: [] }
    const jd = 'Requires JavaScript experience.'
    const result = compareResumeToJob(resumeWithJs, jd)
    const js = result.skillSupport.find((s) => s.skill === 'JavaScript')
    expect(js.category).toBe('supported_differently_phrased')
    expect(js.evidence).toMatch(/JS/)
  })

  it('never changes Java into JavaScript or vice versa when matching', () => {
    const javaResume = { ...resume, skills: ['Java'], experience: [{ organization: 'X', bullets: ['Built backend services in Java'] }], projects: [] }
    const jd = 'Requires JavaScript experience.'
    const result = compareResumeToJob(javaResume, jd)
    expect(result.matchedSkills).not.toContain('JavaScript')
    expect(result.missingSkills).toContain('JavaScript')
  })
})
