import { useRef, useState } from 'react'
import { validateResumeFile, checkPageCount } from '../../lib/resume/fileValidation'
import { extractPdfText } from '../../lib/resume/pdfExtract'
import { extractDocxText } from '../../lib/resume/docxExtract'
import { ocrPdfPage } from '../../lib/resume/ocr'
import { parseResumeText } from '../../lib/resume/sectionParser'

export default function ResumeUpload({ onExtracted }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState('idle') // idle | validating | extracting | ocr | error
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [ocrOffer, setOcrOffer] = useState(null) // { file, pages }
  const [ocrProgress, setOcrProgress] = useState(null)

  const handleFile = async (file) => {
    setError(null)
    setWarning(null)
    setOcrOffer(null)
    setStatus('validating')

    const validation = await validateResumeFile(file)
    if (!validation.ok) {
      setError(validation.message)
      setStatus('error')
      return
    }

    setStatus('extracting')
    // Extraction happens entirely in this browser tab (pdf.js / mammoth,
    // both run locally) — nothing is uploaded anywhere at this step.
    if (validation.type === 'pdf') {
      const result = await extractPdfText(file)
      if (result.error) {
        setError(result.error)
        setStatus('error')
        return
      }
      const pageCheck = checkPageCount(result.pageCount)
      if (!pageCheck.ok) {
        setError(pageCheck.message)
        setStatus('error')
        return
      }
      if (pageCheck.warning) setWarning(pageCheck.warning)

      const meaningfulText = result.text.trim().length > 40
      if (!meaningfulText || result.pagesWithLittleText.length > 0) {
        // Looks like a scanned/image PDF — offer OCR rather than running
        // it automatically (it's slow and this is external-to-pdf.js
        // local processing the user should consciously opt into).
        setOcrOffer({ file, pages: result.pagesWithLittleText.length ? result.pagesWithLittleText : [1] })
        if (meaningfulText) {
          finishExtraction(result.text, { sourceFileName: file.name, sourceFileType: 'pdf' })
        } else {
          setStatus('idle')
        }
        return
      }
      finishExtraction(result.text, { sourceFileName: file.name, sourceFileType: 'pdf' })
    } else {
      const result = await extractDocxText(file)
      if (result.error) {
        setError(result.error)
        setStatus('error')
        return
      }
      finishExtraction(result.text, { sourceFileName: file.name, sourceFileType: 'docx' })
    }
  }

  const finishExtraction = (text, meta) => {
    const parsed = parseResumeText(text)
    setStatus('idle')
    onExtracted(parsed, meta)
  }

  const runOcr = async () => {
    if (!ocrOffer) return
    setStatus('ocr')
    setOcrProgress(0)
    let combinedText = ''
    for (const pageNum of ocrOffer.pages) {
      const result = await ocrPdfPage(ocrOffer.file, pageNum, setOcrProgress)
      if (result.error) {
        setError(`OCR failed: ${result.error}`)
        setStatus('error')
        return
      }
      combinedText += `${result.text}\n`
      if (result.confidence < 60) {
        setWarning(
          (prev) =>
            `${prev ? prev + ' ' : ''}OCR confidence was low (${Math.round(result.confidence)}%) on page ${pageNum} — review extracted text carefully.`,
        )
      }
    }
    finishExtraction(combinedText, { sourceFileName: ocrOffer.file.name, sourceFileType: 'pdf-ocr' })
    setOcrOffer(null)
  }

  return (
    <div className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/40 p-6 text-center">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      <p className="text-sm text-zinc-300">Upload your resume (PDF or DOCX)</p>
      <p className="mt-1 text-xs text-zinc-500">
        Processed entirely in your browser — nothing is uploaded to any server at this step.
      </p>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === 'extracting' || status === 'ocr'}
        className="mt-3 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
      >
        {status === 'validating' && 'Checking file...'}
        {status === 'extracting' && 'Extracting...'}
        {status === 'ocr' && `Running OCR... ${ocrProgress !== null ? Math.round(ocrProgress * 100) + '%' : ''}`}
        {(status === 'idle' || status === 'error') && 'Choose file'}
      </button>

      {error && (
        <p className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-left text-xs text-red-300">
          {error}
        </p>
      )}
      {warning && (
        <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-left text-xs text-amber-300">
          {warning}
        </p>
      )}
      {ocrOffer && status === 'idle' && (
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-left text-xs text-amber-300">
          <p>
            This looks like a scanned (image-only) PDF — little or no selectable text was found on{' '}
            {ocrOffer.pages.length === 1 ? `page ${ocrOffer.pages[0]}` : `${ocrOffer.pages.length} pages`}.
          </p>
          <p className="mt-1 text-amber-400/80">
            OCR runs locally in your browser (Tesseract.js, no external service) but is slower and less
            accurate than text extraction — especially for two-column layouts or unusual fonts.
          </p>
          <button
            onClick={runOcr}
            className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/20 px-3 py-1.5 font-medium text-amber-200 hover:bg-amber-500/30"
          >
            Run OCR on this file
          </button>
        </div>
      )}
    </div>
  )
}
