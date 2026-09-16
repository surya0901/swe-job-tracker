import { describe, it, expect } from 'vitest'
import { diffWords } from '../src/lib/resume/diff'

describe('diffWords', () => {
  it('returns a single equal op for identical text', () => {
    const ops = diffWords('Built a REST API', 'Built a REST API')
    expect(ops.every((o) => o.type === 'equal')).toBe(true)
  })

  it('detects an inserted word', () => {
    const ops = diffWords('Built a REST API', 'Built a scalable REST API')
    expect(ops.some((o) => o.type === 'insert' && o.text.includes('scalable'))).toBe(true)
  })

  it('detects a deleted word', () => {
    const ops = diffWords('Built a scalable REST API', 'Built a REST API')
    expect(ops.some((o) => o.type === 'delete' && o.text.includes('scalable'))).toBe(true)
  })

  it('reassembling all op text reproduces the proposed text', () => {
    const original = 'Wrote unit tests with unittest'
    const proposed = 'Wrote comprehensive unit tests with pytest'
    const ops = diffWords(original, proposed)
    const reassembled = ops
      .filter((o) => o.type !== 'delete')
      .map((o) => o.text)
      .join('')
    expect(reassembled).toBe(proposed)
  })

  it('reassembling non-insert ops reproduces the original text', () => {
    const original = 'Wrote unit tests with unittest'
    const proposed = 'Wrote comprehensive unit tests with pytest'
    const ops = diffWords(original, proposed)
    const reassembled = ops
      .filter((o) => o.type !== 'insert')
      .map((o) => o.text)
      .join('')
    expect(reassembled).toBe(original)
  })
})
