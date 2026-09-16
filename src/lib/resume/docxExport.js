import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ExternalHyperlink,
  BorderStyle,
} from 'docx'
import { buildResumeBlocks } from './documentModel'

/**
 * Renders a structured resume to a real DOCX file — actual editable
 * Paragraph/TextRun/heading structures, not a screenshot of a PDF or a
 * single text blob. Opens and edits normally in Word/Google Docs.
 */
export async function generateResumeDocx(resume) {
  const blocks = buildResumeBlocks(resume)
  const children = []

  for (const block of blocks) {
    switch (block.type) {
      case 'name':
        children.push(
          new Paragraph({
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: block.text, bold: true, size: 32 })],
          }),
        )
        break
      case 'contact': {
        const segments = [
          resume.contact?.email ? { text: resume.contact.email, url: `mailto:${resume.contact.email}` } : null,
          resume.contact?.phone ? { text: resume.contact.phone } : null,
          ...(resume.contact?.links ?? []).map((l) => ({ text: l.url.replace(/^https?:\/\//, ''), url: l.url })),
        ].filter(Boolean)
        const runs = []
        segments.forEach((seg, i) => {
          if (i > 0) runs.push(new TextRun({ text: '   |   ', size: 18, color: '888888' }))
          if (seg.url) {
            runs.push(
              new ExternalHyperlink({
                link: seg.url,
                children: [new TextRun({ text: seg.text, size: 18, color: '2563EB', underline: {} })],
              }),
            )
          } else {
            runs.push(new TextRun({ text: seg.text, size: 18, color: '444444' }))
          }
        })
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: runs }))
        break
      }
      case 'sectionHeading':
        children.push(
          new Paragraph({
            spacing: { before: 240, after: 80 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'AAAAAA' } },
            children: [new TextRun({ text: block.text.toUpperCase(), bold: true, size: 22 })],
          }),
        )
        break
      case 'entryHeader':
        children.push(
          new Paragraph({
            spacing: { before: 100 },
            tabStops: [{ type: 'right', position: 9350 }],
            children: [
              new TextRun({ text: block.text, bold: true, size: 20 }),
              ...(block.right ? [new TextRun({ text: `\t${block.right}`, size: 18, color: '666666' })] : []),
            ],
          }),
        )
        break
      case 'entryDetail':
        children.push(
          new Paragraph({ indent: { left: 240 }, children: [new TextRun({ text: block.text, size: 19, italics: true })] }),
        )
        break
      case 'bullet':
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: block.text, size: 19 })],
          }),
        )
        break
      case 'text':
        children.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: block.text, size: 19 })] }))
        break
      default:
        break
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: { default: { document: { run: { font: 'Calibri' } } } },
  })

  // toBlob (not toBuffer) — works identically in the browser and in Node
  // test environments, since both expose a global Blob; toBuffer expects
  // Node's Buffer, which isn't available in the browser bundle.
  return Packer.toBlob(doc)
}
