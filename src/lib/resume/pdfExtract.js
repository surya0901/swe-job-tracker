// Browser-only PDF text extraction via pdf.js. Runs entirely locally —
// nothing here uploads the file anywhere.
import { reconstructPageText } from './pdfReadingOrder'

let pdfjsLibPromise = null
async function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()
      return mod
    })
  }
  return pdfjsLibPromise
}

/**
 * Extracts text from a PDF File/Blob. Returns
 * { text, pageCount, pagesWithLittleText, error } — pagesWithLittleText
 * is a list of 1-indexed pages that came back nearly empty, the signal
 * used elsewhere to suggest OCR (this module never runs OCR itself).
 */
export async function extractPdfText(file) {
  try {
    const pdfjsLib = await loadPdfjs()
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const doc = await loadingTask.promise

    const pageTexts = []
    const pagesWithLittleText = []
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent()
      const items = content.items
        .filter((i) => typeof i.str === 'string')
        .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], width: i.width }))
      const { text } = reconstructPageText(items, viewport.width)
      pageTexts.push(text)
      if (text.trim().length < 20) pagesWithLittleText.push(pageNum)
    }

    return {
      text: pageTexts.join('\n\n'),
      pageCount: doc.numPages,
      pagesWithLittleText,
      error: null,
    }
  } catch (err) {
    const isPasswordProtected = err?.name === 'PasswordException'
    const message = err instanceof Error ? err.message : String(err)
    return {
      text: '',
      pageCount: 0,
      pagesWithLittleText: [],
      error: isPasswordProtected
        ? 'This PDF is password-protected. Remove the password (most PDF viewers have a "Print to PDF" or "Save a copy" option that strips it) and re-upload.'
        : `Could not read this PDF: ${message}`,
    }
  }
}

/**
 * Renders a page to a canvas data URL, for the side-by-side original
 * preview. Kept separate from text extraction so the review UI can show
 * a page image without re-parsing.
 */
export async function renderPdfPageToDataUrl(file, pageNumber, scale = 1.2) {
  const pdfjsLib = await loadPdfjs()
  const arrayBuffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas.toDataURL('image/png')
}
