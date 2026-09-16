import { buildResumeBlocks } from './documentModel'

export function generateResumePlainText(resume) {
  const blocks = buildResumeBlocks(resume)
  const lines = []
  for (const block of blocks) {
    switch (block.type) {
      case 'name':
        lines.push(block.text.toUpperCase())
        break
      case 'contact':
        lines.push(block.text)
        lines.push('')
        break
      case 'sectionHeading':
        lines.push('')
        lines.push(block.text.toUpperCase())
        lines.push('-'.repeat(block.text.length))
        break
      case 'entryHeader':
        lines.push(block.right ? `${block.text}  (${block.right})` : block.text)
        break
      case 'entryDetail':
        lines.push(`  ${block.text}`)
        break
      case 'bullet':
        lines.push(`  - ${block.text}`)
        break
      case 'text':
        lines.push(block.text)
        break
      default:
        break
    }
  }
  return lines.join('\n')
}

export function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' })
  triggerDownload(blob, filename)
}

export function downloadJsonFile(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' })
  triggerDownload(blob, filename)
}

export function downloadBlob(blob, filename) {
  triggerDownload(blob, filename)
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
