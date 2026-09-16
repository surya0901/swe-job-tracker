// Browser-only DOCX text extraction via mammoth. Runs entirely locally.
let mammothPromise = null
async function loadMammoth() {
  if (!mammothPromise) mammothPromise = import('mammoth')
  return mammothPromise
}

export async function extractDocxText(file) {
  try {
    const mammoth = await loadMammoth()
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return {
      text: result.value,
      warnings: result.messages.map((m) => m.message),
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const isPasswordProtected = /encrypt|password/i.test(message)
    return {
      text: '',
      warnings: [],
      error: isPasswordProtected
        ? 'This file appears to be password-protected. Remove the password (File > Info > Protect Document in Word) and re-upload.'
        : `Could not read this .docx file: ${message}`,
    }
  }
}
