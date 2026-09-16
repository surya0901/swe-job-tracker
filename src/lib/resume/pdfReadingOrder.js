// Pure, testable logic for turning pdf.js's raw positioned text items back
// into reading-order lines — including the common one-column and
// two-column resume layouts. Kept separate from the pdf.js integration
// itself (pdfExtract.js) so it can be unit tested with plain fixture data,
// no browser/PDF engine required.

const Y_TOLERANCE = 3 // points; items within this are "the same line"

/**
 * items: [{ str, x, y, width }] in PDF coordinate space (y increases
 * upward). Returns lines: [{ y, xStart, text }] sorted top-to-bottom.
 * Grouping must happen WITHIN a single column's items — grouping across
 * the full page width first would merge a left-column row with a
 * right-column row that happen to share the same y (very common: a
 * sidebar and the main content both start their first line at the top
 * of the page). Column splitting is decided on raw items in
 * reconstructPageText below, before this function ever runs.
 */
function groupIntoLines(items) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)
  const lines = []
  for (const item of sorted) {
    if (!item.str.trim()) continue
    const line = lines.find((l) => Math.abs(l.y - item.y) <= Y_TOLERANCE)
    if (line) {
      line.items.push(item)
      line.xStart = Math.min(line.xStart, item.x)
    } else {
      lines.push({ y: item.y, xStart: item.x, items: [item] })
    }
  }
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x)
    // pdf.js doesn't synthesize a space between separate text runs (e.g.
    // two different drawText() calls on the same line, like a label and
    // a far-right-aligned date) — a real horizontal gap between one
    // item's end and the next item's start is a genuine word/field
    // boundary even without an explicit space character.
    line.text = line.items.reduce((acc, item, idx) => {
      if (idx === 0) return item.str
      const prev = line.items[idx - 1]
      const gap = item.x - (prev.x + (prev.width ?? 0))
      const needsSpace = gap > 1 && !acc.endsWith(' ') && !item.str.startsWith(' ')
      return acc + (needsSpace ? ' ' : '') + item.str
    }, '')
  }
  return lines.sort((a, b) => b.y - a.y)
}

/**
 * Detects whether a page's items form two side-by-side columns by
 * looking at x-positions directly (not pre-grouped lines) — a genuine
 * gap around the horizontal middle, with a meaningful number of
 * *distinct rows* on each side spanning a real portion of the page's
 * height. This deliberately requires more than "some items on the
 * right" — a single-column resume with a handful of right-aligned dates
 * (very common) must NOT be misdetected as two columns just because
 * those dates cluster past the midpoint.
 */
function detectTwoColumns(items, pageWidth) {
  if (!pageWidth || items.length < 6) return null
  const mid = pageWidth / 2
  const left = items.filter((i) => i.x < mid - 10)
  const right = items.filter((i) => i.x >= mid + 10)
  const straddling = items.length - left.length - right.length
  if (left.length < 3 || right.length < 3 || straddling > items.length * 0.25) return null

  const distinctRows = (group) => new Set(group.map((i) => Math.round(i.y / Y_TOLERANCE))).size
  const leftRows = distinctRows(left)
  const rightRows = distinctRows(right)
  // A real second column has a meaningful number of its own rows — not
  // just 2-4 short tokens (dates, a page number) reusing rows the left
  // column already occupies.
  if (rightRows < 4 || rightRows < leftRows * 0.3) return null

  const yRange = (group) => Math.max(...group.map((i) => i.y)) - Math.min(...group.map((i) => i.y))
  const leftSpan = yRange(left)
  const rightSpan = yRange(right)
  // A real sidebar/column runs down a substantial portion of whatever
  // vertical space the main column uses — a few dates scattered near
  // existing left-side lines only span a tiny fraction of that range.
  if (leftSpan > 0 && rightSpan < leftSpan * 0.3) return null

  return { left, right }
}

export function reconstructPageText(items, pageWidth) {
  const nonEmpty = items.filter((i) => i.str.trim())
  const columns = detectTwoColumns(nonEmpty, pageWidth)
  if (columns) {
    const leftLines = groupIntoLines(columns.left)
    const rightLines = groupIntoLines(columns.right)
    const leftText = leftLines.map((l) => l.text).join('\n')
    const rightText = rightLines.map((l) => l.text).join('\n')
    return { text: `${leftText}\n\n${rightText}`, twoColumn: true }
  }
  const lines = groupIntoLines(nonEmpty)
  return { text: lines.map((l) => l.text).join('\n'), twoColumn: false }
}
