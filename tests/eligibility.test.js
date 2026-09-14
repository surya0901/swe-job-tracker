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
    expect(result.excerpts.join(' ')).toMatch(/graduating in 2027/)
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
    // Quotes the source's actual wording ("minimum of 5 years") — never a
    // synthesized "5+ years" the posting didn't literally say.
    expect(result.excerpts.join(' ')).toMatch(/minimum of 5 years/)
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

describe('classifyEligibility: negative new-grad signals override keyword matches (the Stripe bug)', () => {
  it('excludes a posting that tells new grads not to apply through it, even though "new grad" appears in the text', () => {
    const result = classifyEligibility({
      title: 'Backend/API Engineer, Money as a Service',
      description:
        'Note: if you are an intern, new grad, staff, front-end, or full-stack applicant, please do not apply using this link and visit our jobs page for those specific postings. Who we are: Stripe is a financial infrastructure platform.',
    })
    expect(result.category).toBe('excluded')
    expect(result.excerpts[0]).toMatch(/please do not apply/i)
  })

  it('does not exclude a genuinely new-grad-accepting posting just because it also mentions interns elsewhere positively', () => {
    const result = classifyEligibility({
      title: 'Software Engineer, New Grad',
      description: 'We welcome new grads and former interns who want to convert to full-time roles.',
    })
    expect(result.category).not.toBe('excluded')
  })

  it('excludes when a posting redirects graduates to a different program without an explicit negation word', () => {
    const result = classifyEligibility({
      title: 'Software Engineer',
      description: 'New grad candidates should apply through our University Program instead — visit our jobs page for those specific postings.',
    })
    expect(result.category).toBe('excluded')
  })
})

describe('classifyEligibility: software relevance vs. program structure (the Caterpillar bug)', () => {
  it('does not treat a welding rotational program as software-relevant', () => {
    const result = classifyEligibility({
      title: '2027 Engineering Rotational Product Development Program-Welding',
      description: '',
    })
    expect(result.category).toBe('excluded')
    expect(result.softwareRelevance).toBe('not_software')
  })

  it('does not treat a materials rotational program as software-relevant', () => {
    const result = classifyEligibility({
      title: '2027 Engineering Rotational Product Development - Materials',
      description: '',
    })
    expect(result.softwareRelevance).toBe('not_software')
  })

  it('marks a generic "Technology Development Program" title as uncertain, not confirmed, absent further evidence', () => {
    const result = classifyEligibility({
      title: 'Technology Development Program Associate',
      description: '',
    })
    expect(result.category).toBe('rotational_tdp')
    expect(result.softwareRelevance).toBe('uncertain')
    expect(result.reviewState).toBe('needs_review')
  })

  it('confirms a rotational program as software-relevant when the title names an explicit software track', () => {
    const result = classifyEligibility({
      title: 'Technology Leadership Program - Application Development',
      description: '',
    })
    expect(result.softwareRelevance).toBe('confirmed')
  })

  it('does not confirm software relevance from generic corporate boilerplate mentioning "software" incidentally', () => {
    // Regression: a Sales/Account Executive posting at a software company
    // whose "About Us" boilerplate says "our software powers millions of
    // businesses" must not be classified as a software role.
    const result = classifyEligibility({
      title: 'Account Executive, Commercial',
      description: 'Stripe is a financial infrastructure platform. Our software powers millions of businesses worldwide.',
    })
    expect(result.softwareRelevance).toBe('not_software')
    expect(result.category).toBe('excluded')
  })
})

describe('classifyEligibility: no fabricated ranges', () => {
  it("quotes the source's actual wording instead of synthesizing a range like \"0-2 years\"", () => {
    const result = classifyEligibility({
      title: 'Software Engineer',
      description: 'Candidates must have a minimum of two years of professional experience.',
    })
    // Whatever the outcome, nothing in the evidence/excerpts may contain
    // an invented "0-2" range that the source never stated.
    const allText = [...result.evidence, ...result.excerpts].join(' ')
    expect(allText).not.toMatch(/0-2 years/)
  })
})
