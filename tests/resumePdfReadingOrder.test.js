import { describe, it, expect } from 'vitest'
import { reconstructPageText } from '../src/lib/resume/pdfReadingOrder'

describe('reconstructPageText: one-column layout', () => {
  it('reads top-to-bottom in a single column', () => {
    const items = [
      { str: 'Line One', x: 50, y: 700 },
      { str: 'Line Two', x: 50, y: 680 },
      { str: 'Line Three', x: 50, y: 660 },
    ]
    const { text, twoColumn } = reconstructPageText(items, 612)
    expect(twoColumn).toBe(false)
    expect(text.split('\n')).toEqual(['Line One', 'Line Two', 'Line Three'])
  })

  it('joins items on the same line left to right', () => {
    const items = [
      { str: 'World', x: 100, y: 700 },
      { str: 'Hello ', x: 50, y: 700 },
    ]
    const { text } = reconstructPageText(items, 612)
    expect(text).toBe('Hello World')
  })

  it('inserts a space between two adjacent items with no explicit trailing space', () => {
    // pdf.js doesn't synthesize whitespace between separate text runs
    // (e.g. an email and phone drawn as two drawText() calls) — a real
    // gap between them must still produce readable, correctly-spaced text.
    const items = [
      { str: 'jane@example.com', x: 50, y: 700, width: 100 },
      { str: '(555) 123-4567', x: 160, y: 700, width: 80 },
    ]
    const { text } = reconstructPageText(items, 612)
    expect(text).toBe('jane@example.com (555) 123-4567')
  })

  it('regression: a single-column entry header with a far right-aligned date is NOT misdetected as two columns', () => {
    // This is exactly the real-world shape a resume's "Company — Title"
    // line plus a right-aligned date range produces, and it previously
    // triggered a false two-column detection that separated every date
    // in the document from its actual line, corrupting startDate/endDate
    // parsing throughout the whole resume.
    const items = [
      { str: 'Acme Corp — Software Engineering Intern', x: 54, y: 700, width: 250 },
      { str: 'Jun 2025 – Aug 2025', x: 480, y: 700, width: 90 },
      { str: '• Built a REST API in Python', x: 66, y: 680, width: 200 },
      { str: '• Wrote unit tests with pytest', x: 66, y: 660, width: 200 },
    ]
    const { text, twoColumn } = reconstructPageText(items, 612)
    expect(twoColumn).toBe(false)
    expect(text).toContain('Acme Corp — Software Engineering Intern Jun 2025 – Aug 2025')
  })
})

describe('reconstructPageText: two-column layout', () => {
  it('reads the full left column top-to-bottom, then the full right column', () => {
    const pageWidth = 600
    const items = [
      // left column (x < 300)
      { str: 'Skills', x: 40, y: 700 },
      { str: 'Python', x: 40, y: 680 },
      { str: 'React', x: 40, y: 660 },
      { str: 'SQL', x: 40, y: 640 },
      // right column (x >= 300)
      { str: 'Experience', x: 320, y: 700 },
      { str: 'Acme Corp', x: 320, y: 680 },
      { str: 'Beta Inc', x: 320, y: 660 },
      { str: 'Gamma LLC', x: 320, y: 640 },
    ]
    const { text, twoColumn } = reconstructPageText(items, pageWidth)
    expect(twoColumn).toBe(true)
    const lines = text.split('\n').filter(Boolean)
    const skillsIdx = lines.indexOf('Skills')
    const experienceIdx = lines.indexOf('Experience')
    expect(skillsIdx).toBeGreaterThanOrEqual(0)
    expect(experienceIdx).toBeGreaterThan(skillsIdx)
    // The whole left column comes before the whole right column, not
    // interleaved by y-position (which would scramble reading order).
    expect(lines.slice(0, 4)).toEqual(['Skills', 'Python', 'React', 'SQL'])
    expect(lines.slice(4)).toEqual(['Experience', 'Acme Corp', 'Beta Inc', 'Gamma LLC'])
  })

  it('does not misdetect two columns from a single wide heading plus body text', () => {
    const pageWidth = 600
    const items = [
      { str: 'A Full-Width Heading Spanning The Page', x: 40, y: 700 },
      { str: 'Normal paragraph line one', x: 40, y: 680 },
      { str: 'Normal paragraph line two', x: 40, y: 660 },
      { str: 'Normal paragraph line three', x: 40, y: 640 },
      { str: 'Normal paragraph line four', x: 40, y: 620 },
    ]
    const { twoColumn } = reconstructPageText(items, pageWidth)
    expect(twoColumn).toBe(false)
  })
})
