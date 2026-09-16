// Uploaded files are untrusted input: validate the actual file signature
// (magic bytes), not just the extension/MIME type the browser reports
// (both are trivially spoofable), and enforce resource limits before any
// parsing touches the bytes.

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
export const MAX_REASONABLE_PAGES = 4 // soft warning threshold for a resume
export const HARD_MAX_PAGES = 20 // beyond this, likely the wrong file entirely

const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] // "%PDF"
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] // DOCX is a zip container

function bytesStartWith(bytes, magic) {
  if (bytes.length < magic.length) return false
  return magic.every((b, i) => bytes[i] === b)
}

export async function detectFileType(file) {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  if (bytesStartWith(head, PDF_MAGIC)) return 'pdf'
  if (bytesStartWith(head, ZIP_MAGIC)) return 'docx' // narrowed further by extension below
  return 'unknown'
}

/**
 * Validates an uploaded resume file. Returns { ok: true, type } or
 * { ok: false, reason, message } — never throws, so callers can always
 * show a clear, specific error rather than a stack trace.
 */
export async function validateResumeFile(file) {
  if (!file) return { ok: false, reason: 'missing', message: 'No file selected.' }

  if (file.size === 0) {
    return { ok: false, reason: 'empty', message: 'That file is empty (0 bytes).' }
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      reason: 'too_large',
      message: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB. Try exporting a smaller/compressed version.`,
    }
  }

  const detected = await detectFileType(file)
  const extension = (file.name.split('.').pop() || '').toLowerCase()

  if (detected === 'pdf') {
    if (extension && extension !== 'pdf') {
      return {
        ok: false,
        reason: 'extension_mismatch',
        message: `This file's content is a PDF, but it's named ".${extension}" — rename it to .pdf and try again.`,
      }
    }
    return { ok: true, type: 'pdf' }
  }

  if (detected === 'docx') {
    if (extension !== 'docx') {
      return {
        ok: false,
        reason: 'extension_mismatch',
        message: `This looks like a zip-based document but isn't named ".docx" — only .docx is supported (not legacy .doc).`,
      }
    }
    return { ok: true, type: 'docx' }
  }

  return {
    ok: false,
    reason: 'unrecognized_format',
    message: 'Unrecognized file format. Upload a PDF (.pdf) or Word document (.docx) — legacy .doc and image files are not supported.',
  }
}

export function checkPageCount(pageCount) {
  if (pageCount > HARD_MAX_PAGES) {
    return {
      ok: false,
      message: `This file has ${pageCount} pages — that's far more than a resume, so something looks wrong. Double check you uploaded the right file.`,
    }
  }
  if (pageCount > MAX_REASONABLE_PAGES) {
    return {
      ok: true,
      warning: `This resume is ${pageCount} pages. Most reviewers expect 1-2 pages (up to ~4 for extensive experience) — consider trimming before applying.`,
    }
  }
  return { ok: true, warning: null }
}
