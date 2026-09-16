// OCR fallback for scanned (image-only) PDF pages, via tesseract.js —
// runs entirely in the browser (WASM), no network call, no external
// service. Only invoked on an explicit user action (never automatically)
// since it's slow and the extraction step already reports which pages
// look like they need it.
import { renderPdfPageToDataUrl } from './pdfExtract'

let tesseractPromise = null
async function loadTesseract() {
  if (!tesseractPromise) {
    tesseractPromise = import('tesseract.js')
  }
  return tesseractPromise
}

/**
 * Runs OCR on one PDF page. Returns { text, confidence, error }.
 * confidence is Tesseract's own 0-100 mean-confidence score — surfaced so
 * the UI can honestly label low-confidence OCR output rather than
 * presenting it as equivalent to real extracted text.
 */
export async function ocrPdfPage(file, pageNumber, onProgress) {
  try {
    const { createWorker } = await loadTesseract()
    const dataUrl = await renderPdfPageToDataUrl(file, pageNumber, 2) // higher scale helps OCR accuracy
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (onProgress && m.status === 'recognizing text') onProgress(m.progress)
      },
    })
    const {
      data: { text, confidence },
    } = await worker.recognize(dataUrl)
    await worker.terminate()
    return { text, confidence, error: null }
  } catch (err) {
    return { text: '', confidence: 0, error: err instanceof Error ? err.message : String(err) }
  }
}
