import { describe, it, expect } from 'vitest'
import { validateResumeFile, checkPageCount, MAX_FILE_SIZE_BYTES } from '../src/lib/resume/fileValidation'

function makeFile(bytes, name, type = 'application/octet-stream') {
  return new File([bytes], name, { type })
}

const PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]) // "%PDF-1.4"
const ZIP_HEADER = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])

describe('validateResumeFile: treats content as untrusted, validates real bytes', () => {
  it('accepts a real PDF signature named .pdf', async () => {
    const result = await validateResumeFile(makeFile(PDF_HEADER, 'resume.pdf'))
    expect(result.ok).toBe(true)
    expect(result.type).toBe('pdf')
  })

  it('accepts a real DOCX (zip) signature named .docx', async () => {
    const result = await validateResumeFile(makeFile(ZIP_HEADER, 'resume.docx'))
    expect(result.ok).toBe(true)
    expect(result.type).toBe('docx')
  })

  it('rejects a file whose content is a PDF but is named .docx (spoofed extension)', async () => {
    const result = await validateResumeFile(makeFile(PDF_HEADER, 'resume.docx'))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('extension_mismatch')
  })

  it('rejects a plain text file renamed to .pdf (fake magic bytes)', async () => {
    const fakeBytes = new TextEncoder().encode('this is not a real pdf')
    const result = await validateResumeFile(makeFile(fakeBytes, 'resume.pdf'))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('unrecognized_format')
  })

  it('rejects a legacy .doc file (only .docx is supported)', async () => {
    const result = await validateResumeFile(makeFile(ZIP_HEADER, 'resume.doc'))
    expect(result.ok).toBe(false)
  })

  it('rejects an empty file', async () => {
    const result = await validateResumeFile(makeFile(new Uint8Array([]), 'resume.pdf'))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('empty')
  })

  it('rejects a file over the size limit with a clear, specific message', async () => {
    const oversized = new Uint8Array(MAX_FILE_SIZE_BYTES + 1)
    oversized.set(PDF_HEADER)
    const result = await validateResumeFile(makeFile(oversized, 'resume.pdf'))
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('too_large')
    expect(result.message).toMatch(/MB/)
  })

  it('handles a missing file without throwing', async () => {
    const result = await validateResumeFile(null)
    expect(result.ok).toBe(false)
  })
})

describe('checkPageCount', () => {
  it('passes with no warning for a typical 1-2 page resume', () => {
    expect(checkPageCount(1).warning).toBeNull()
    expect(checkPageCount(2).warning).toBeNull()
  })

  it('warns (but does not reject) for a long-but-plausible resume', () => {
    const result = checkPageCount(6)
    expect(result.ok).toBe(true)
    expect(result.warning).toMatch(/pages/)
  })

  it('rejects a page count so high it is clearly the wrong file', () => {
    const result = checkPageCount(50)
    expect(result.ok).toBe(false)
  })
})
