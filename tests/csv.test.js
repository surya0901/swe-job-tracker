import { describe, it, expect } from 'vitest'
import { jobsToCsv } from '../src/lib/csv'

describe('jobsToCsv: escaping and formula-injection safety', () => {
  it('quotes fields containing commas', () => {
    const csv = jobsToCsv([{ companyName: 'Acme, Inc.', title: 'SWE' }])
    expect(csv).toContain('"Acme, Inc."')
  })

  it('escapes embedded quotes by doubling them', () => {
    const csv = jobsToCsv([{ companyName: 'Say "Hi" Inc', title: 'SWE' }])
    expect(csv).toContain('"Say ""Hi"" Inc"')
  })

  it('neutralizes a value starting with = to prevent formula injection', () => {
    const csv = jobsToCsv([{ companyName: '=cmd|"/c calc"!A1', title: 'SWE' }])
    const rows = csv.split('\n')
    expect(rows[1].startsWith("'=") || rows[1].startsWith('"\'=')).toBe(true)
    expect(rows[1]).not.toMatch(/^=/)
  })

  it('neutralizes values starting with +, -, or @', () => {
    for (const prefix of ['+', '-', '@']) {
      const csv = jobsToCsv([{ companyName: `${prefix}SUM(1+1)`, title: 'SWE' }])
      const dataRow = csv.split('\n')[1]
      expect(dataRow.startsWith(prefix)).toBe(false)
    }
  })

  it('does not alter a normal value that happens to contain a hyphen mid-string', () => {
    const csv = jobsToCsv([{ companyName: 'Well-Known Co', title: 'SWE' }])
    expect(csv).toContain('Well-Known Co')
  })
})
