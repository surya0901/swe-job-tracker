import { useState } from 'react'
import { generateResumePdf, TEMPLATES } from '../../lib/resume/pdfExport'
import { generateResumeDocx } from '../../lib/resume/docxExport'
import { generateResumePlainText, downloadTextFile, downloadJsonFile, downloadBlob } from '../../lib/resume/textExport'

function safeFilename(name, suffix) {
  const base = (name || 'resume').replace(/[^a-z0-9]+/gi, '_')
  return `${base}_${suffix}`
}

export default function ExportPanel({ resume, versionMeta }) {
  const [template, setTemplate] = useState('standard')
  const [targetPages, setTargetPages] = useState(1)
  const [status, setStatus] = useState(null)
  const [lastResult, setLastResult] = useState(null)

  const name = resume.contact?.name || 'resume'

  const exportPdf = async () => {
    setStatus('pdf')
    const result = await generateResumePdf(resume, { template, targetPages })
    downloadBlob(new Blob([result.bytes], { type: 'application/pdf' }), safeFilename(name, 'resume.pdf'))
    setLastResult({ type: 'pdf', pageCount: result.pageCount, overflowed: result.overflowed })
    setStatus(null)
  }

  const exportDocx = async () => {
    setStatus('docx')
    const blob = await generateResumeDocx(resume)
    downloadBlob(blob, safeFilename(name, 'resume.docx'))
    setStatus(null)
  }

  const exportText = () => {
    downloadTextFile(generateResumePlainText(resume), safeFilename(name, 'resume.txt'))
  }

  const exportJson = () => {
    downloadJsonFile({ resume, versionMeta: versionMeta ?? null, exportedAt: new Date().toISOString() }, safeFilename(name, 'resume.json'))
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">Export</h3>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Template</label>
          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            {Object.entries(TEMPLATES).map(([key, t]) => (
              <option key={key} value={key}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-zinc-500">Target length</label>
          <select
            value={targetPages}
            onChange={(e) => setTargetPages(Number(e.target.value))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value={1}>1 page</option>
            <option value={2}>2 pages</option>
          </select>
        </div>
      </div>

      {lastResult?.type === 'pdf' && lastResult.overflowed && (
        <p className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          This resume ran to {lastResult.pageCount} pages — longer than your {targetPages}-page target. Nothing was
          shrunk to force a fit; trim content or increase the target instead of producing unreadably small text.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={exportPdf}
          disabled={status === 'pdf'}
          className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {status === 'pdf' ? 'Generating...' : 'Download PDF'}
        </button>
        <button
          onClick={exportDocx}
          disabled={status === 'docx'}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          {status === 'docx' ? 'Generating...' : 'Download DOCX'}
        </button>
        <button
          onClick={exportText}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
        >
          Plain text
        </button>
        <button
          onClick={exportJson}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
        >
          JSON backup
        </button>
      </div>
      <p className="mt-2 text-[10px] text-zinc-600">
        PDF and DOCX both contain real selectable/editable text — no ATS pass is guaranteed by any template.
      </p>
    </div>
  )
}
