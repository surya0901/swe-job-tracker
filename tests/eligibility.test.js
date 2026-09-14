import { describe, it, expect } from 'vitest'
import { classifyEligibility } from '../scripts/lib/eligibility.mjs'

describe('classifyEligibility: description-aware classification', () => {
  it('classifies "Software Engineer I" as entry level from the title alone', () => {
    const result = classifyEligibility({ title: 'Software Engineer I', description: '' })
    expect(result.category).toBe('entry_level')
  })

  it('classifies "Software Engineer I" as entry level even with a trailing location suffix', () => {
    const result = classifyEligibility({ title: 'Software Engineer I -(Onsite)', description: '' })
    expect(result.category).toBe('entry_level')
  })

  it('picks up new-grad evidence from the description when the title is generic', () => {
    const result = classifyEligibility({
      title: 'Software Engineer',
      description: 'We are excited to welcome candidates graduating in 2027 to our team.',
    })
    expect(result.category).toBe('explicit_new_grad')
    expect(result.evidence[0]).toMatch(/graduating in 2027/)
  })

  it('does NOT exclude a new-grad role whose description mentions past internship experience', () => {
    const result = classifyEligibility({
      title: 'Software Engineer, New Grad',
      description: 'Ideal candidates may have completed a prior internship in software engineering.',
    })
    expect(result.category).not.toBe('excluded')
  })

  it('does NOT exclude a new-grad role whose description mentions working with senior engineers', () => {
    const result = classifyEligibility({
      title: 'Associate Software Engineer',
      description: "You'll collaborate closely with senior engineers and the engineering manager on your team.",
    })
    expect(result.category).not.toBe('excluded')
  })

  it('distinguishes required from preferred experience: preferred 5 years does not exclude', () => {
    const result = classifyEligibility({
      title: 'Software Engineer',
      description: '5+ years of Kubernetes experience preferred but not required.',
    })
    expect(result.category).not.toBe('excluded')
  })

  it('excludes when experience is explicitly required at a senior threshold', () => {
    const result = classifyEligibility({
      title: 'Software Engineer',
      description: 'Candidates must have a minimum of 5 years of professional experience.',
    })
    expect(result.category).toBe('excluded')
    expect(result.evidence[0]).toMatch(/5\+ years/)
  })

  it('treats "0-2 years" required as entry level, not excluded', () => {
    const result = classifyEligibility({
      title: 'Software Engineer',
      description: 'This role requires 0-2 years of relevant experience.',
    })
    expect(result.category).toBe('entry_level')
  })

  it('classifies a rotational/TDP title as rotational_tdp even without new-grad wording', () => {
    const result = classifyEligibility({
      title: 'Technology Development Program Associate - August 2027',
      description: '',
    })
    expect(result.category).toBe('rotational_tdp')
  })

  it('excludes internships', () => {
    expect(classifyEligibility({ title: 'Software Engineering Intern', description: '' }).category).toBe('excluded')
  })

  it('excludes senior/staff/lead/principal titles', () => {
    for (const title of ['Senior Software Engineer', 'Staff Software Engineer', 'Lead Software Engineer', 'Principal Engineer']) {
      expect(classifyEligibility({ title, description: '' }).category).toBe('excluded')
    }
  })

  it('excludes level II/III/IV titles even with a location suffix', () => {
    expect(
      classifyEligibility({ title: 'Software Engineer II - Embedded Communications, Onsite', description: '' })
        .category,
    ).toBe('excluded')
  })

  it('excludes non-software roles', () => {
    expect(classifyEligibility({ title: 'Retail Store Associate', description: '' }).category).toBe('excluded')
  })

  it('falls back to possibly_eligible with review guidance when no signal is found', () => {
    const result = classifyEligibility({ title: 'Software Engineer', description: '' })
    expect(result.category).toBe('possibly_eligible')
    expect(result.evidence[0]).toMatch(/review/i)
  })
})
