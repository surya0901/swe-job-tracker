import { describe, it, expect } from 'vitest'
import { analyzeLocally } from '../src/lib/resumeAnalysis'

describe('analyzeLocally: real, non-fabricated comparison', () => {
  const jd = 'Looking for a software engineer with Kubernetes, gRPC, and Docker experience. 5+ years preferred.'
  const resume = 'Built a Docker-based deployment pipeline.\nWrote tests with Jest.'

  it('only reports missing keywords that literally appear in the JD text', () => {
    const result = analyzeLocally(jd, resume)
    expect(result.missingKeywords).toContain('Kubernetes')
    expect(result.missingKeywords).toContain('gRPC')
    // "React" is never mentioned in this JD — must never be invented as missing/matched
    expect(result.missingKeywords).not.toContain('React')
    expect(result.matchedKeywords).not.toContain('React')
  })

  it('only reports matched keywords that literally appear in the resume text', () => {
    const result = analyzeLocally(jd, resume)
    expect(result.matchedKeywords).toContain('Docker')
    expect(result.matchedKeywords).not.toContain('Kubernetes')
  })

  it('every bullet-evidence entry is a line copied verbatim from the resume', () => {
    const result = analyzeLocally(jd, resume)
    for (const evidence of result.bulletEvidence) {
      expect(resume).toContain(evidence.bullet)
    }
  })

  it('flags an explicit years-of-experience gate in the reality check', () => {
    const result = analyzeLocally(jd, resume)
    expect(result.realityCheck.some((note) => note.includes('5+ years'))).toBe(true)
  })

  it('never returns a mode field claiming AI ran', () => {
    const result = analyzeLocally(jd, resume)
    expect(result.mode).toBe('local')
  })
})
