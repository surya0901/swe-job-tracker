import { PDFDocument, StandardFonts, rgb, PDFName, PDFString } from 'pdf-lib'
import { buildResumeBlocks } from './documentModel'

export const TEMPLATES = {
  standard: {
    name: 'Clean single-column',
    pageMargin: 54,
    nameSize: 20,
    headingSize: 12,
    bodySize: 10.5,
    lineGap: 1.28,
    sectionGapBefore: 12,
  },
  compact: {
    name: 'Compact',
    pageMargin: 40,
    nameSize: 17,
    headingSize: 10.5,
    bodySize: 9.5,
    lineGap: 1.15,
    sectionGapBefore: 8,
  },
}

const PAGE_WIDTH = 612 // US Letter, points
const PAGE_HEIGHT = 792

function wrapText(text, font, size, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

function addLinkAnnotation(page, rect, url) {
  const doc = page.doc
  const linkAnnot = doc.context.register(
    doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: rect,
      Border: [0, 0, 0],
      C: [0, 0, 1],
      A: {
        Type: 'Action',
        S: 'URI',
        URI: PDFString.of(url),
      },
    }),
  )
  const existing = page.node.Annots()
  if (existing) {
    existing.push(linkAnnot)
  } else {
    page.node.set(PDFName.of('Annots'), doc.context.obj([linkAnnot]))
  }
}

/**
 * Renders a structured resume to a real, searchable, selectable-text PDF.
 * Returns { bytes, pageCount, overflowed } — overflowed is true if the
 * content ran past `targetPages`, surfaced so the UI can show an honest
 * overflow warning instead of silently shrinking text to fit.
 */
export async function generateResumePdf(resume, { template = 'standard', targetPages = 1 } = {}) {
  const cfg = TEMPLATES[template] ?? TEMPLATES.standard
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  const contentWidth = PAGE_WIDTH - cfg.pageMargin * 2
  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - cfg.pageMargin
  let pageCount = 1

  const newPage = () => {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - cfg.pageMargin
    pageCount += 1
  }

  const ensureSpace = (needed) => {
    if (y - needed < cfg.pageMargin) newPage()
  }

  const drawLine = (text, { size, bold = false, indent = 0, color = rgb(0.1, 0.1, 0.1), linkUrl = null } = {}) => {
    const f = bold ? boldFont : font
    const lineHeight = size * cfg.lineGap
    ensureSpace(lineHeight)
    page.drawText(text, { x: cfg.pageMargin + indent, y: y - size, size, font: f, color })
    if (linkUrl) {
      const width = f.widthOfTextAtSize(text, size)
      addLinkAnnotation(page, [cfg.pageMargin + indent, y - size - 2, cfg.pageMargin + indent + width, y + 2], linkUrl)
    }
    y -= lineHeight
  }

  const drawWrapped = (text, { size, indent = 0, bullet = false } = {}) => {
    const f = font
    const prefix = bullet ? '•  ' : ''
    const maxWidth = contentWidth - indent - f.widthOfTextAtSize(prefix, size)
    const lines = wrapText(text, f, size, maxWidth)
    lines.forEach((line, i) => {
      const lineHeight = size * cfg.lineGap
      ensureSpace(lineHeight)
      const displayLine = i === 0 ? `${prefix}${line}` : `${' '.repeat(prefix.length)}${line}`
      page.drawText(displayLine, { x: cfg.pageMargin + indent, y: y - size, size, font: f, color: rgb(0.15, 0.15, 0.15) })
      y -= lineHeight
    })
  }

  const blocks = buildResumeBlocks(resume)
  const links = resume.contact?.links ?? []

  for (const block of blocks) {
    switch (block.type) {
      case 'name':
        drawLine(block.text, { size: cfg.nameSize, bold: true })
        break
      case 'contact': {
        // Each piece (email, phone, each link) is its own clickable
        // segment on one line, not one opaque string — links are real,
        // working hyperlink annotations, not decorative text.
        const size = cfg.bodySize - 1
        const color = rgb(0.35, 0.35, 0.35)
        const linkColor = rgb(0.15, 0.15, 0.55)
        const segments = [
          resume.contact?.email ? { text: resume.contact.email, url: `mailto:${resume.contact.email}` } : null,
          resume.contact?.phone ? { text: resume.contact.phone } : null,
          ...links.map((l) => ({ text: l.url.replace(/^https?:\/\//, ''), url: l.url })),
        ].filter(Boolean)

        ensureSpace(size * cfg.lineGap)
        let x = cfg.pageMargin
        const sep = '   |   '
        segments.forEach((seg, i) => {
          const segColor = seg.url ? linkColor : color
          page.drawText(seg.text, { x, y: y - size, size, font, color: segColor })
          const w = font.widthOfTextAtSize(seg.text, size)
          if (seg.url) addLinkAnnotation(page, [x, y - size - 2, x + w, y + 2], seg.url)
          x += w
          if (i < segments.length - 1) {
            page.drawText(sep, { x, y: y - size, size, font, color })
            x += font.widthOfTextAtSize(sep, size)
          }
        })
        y -= size * cfg.lineGap
        break
      }
      case 'sectionHeading':
        y -= cfg.sectionGapBefore
        ensureSpace(cfg.headingSize * cfg.lineGap + 4)
        drawLine(block.text.toUpperCase(), { size: cfg.headingSize, bold: true })
        // underline
        page.drawLine({
          start: { x: cfg.pageMargin, y: y + cfg.headingSize * 0.3 },
          end: { x: PAGE_WIDTH - cfg.pageMargin, y: y + cfg.headingSize * 0.3 },
          thickness: 0.75,
          color: rgb(0.6, 0.6, 0.6),
        })
        y -= 4
        break
      case 'entryHeader': {
        const lineHeight = cfg.bodySize * cfg.lineGap
        ensureSpace(lineHeight)
        page.drawText(block.text, {
          x: cfg.pageMargin,
          y: y - cfg.bodySize,
          size: cfg.bodySize,
          font: boldFont,
          color: rgb(0.1, 0.1, 0.1),
        })
        if (block.right) {
          const w = font.widthOfTextAtSize(block.right, cfg.bodySize - 0.5)
          page.drawText(block.right, {
            x: PAGE_WIDTH - cfg.pageMargin - w,
            y: y - cfg.bodySize,
            size: cfg.bodySize - 0.5,
            font,
            color: rgb(0.4, 0.4, 0.4),
          })
        }
        y -= lineHeight
        break
      }
      case 'entryDetail':
        drawWrapped(block.text, { size: cfg.bodySize - 0.5, indent: 12 })
        break
      case 'bullet':
        drawWrapped(block.text, { size: cfg.bodySize, indent: 12, bullet: true })
        break
      case 'text':
        drawWrapped(block.text, { size: cfg.bodySize })
        break
      default:
        break
    }
  }

  const bytes = await doc.save()
  return { bytes, pageCount, overflowed: pageCount > targetPages }
}
