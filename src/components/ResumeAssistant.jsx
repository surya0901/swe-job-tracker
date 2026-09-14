import { useState } from 'react'
import { analyzeResume } from '../lib/mockResumeAnalysis'

const TABS = ['Missing Keywords', 'Bullet Suggestions', 'Reality Check']

export default function ResumeAssistant() {
  const [jobDescription, setJobDescription] = useState('')
  const [resume, setResume] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [activeTab, setActiveTab] = useState(TABS[0])

  const canAnalyze = jobDescription.trim() && resume.trim() && !loading

  const runAnalysis = async () => {
    setLoading(true)
    // NOTE: this calls a mock/local function. In production, point this at
    // a server route that calls an LLM (see src/lib/mockResumeAnalysis.js).
    const result = await analyzeResume(jobDescription, resume)
    setAnalysis(result)
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Target Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
            placeholder="Paste the job description here..."
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Current Resume
          </label>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={10}
            placeholder="Paste your resume text here..."
            className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <button
          onClick={runAnalysis}
          disabled={!canAnalyze}
          className="self-start rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          {loading ? 'Analyzing...' : 'Analyze Resume'}
        </button>
      </div>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
        {!analysis && !loading && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center text-sm text-zinc-600">
            <p>Paste a job description and resume, then click Analyze.</p>
            <p className="mt-1 text-xs text-zinc-700">
              This demo uses mock analysis data — wire it up to an LLM API route to make it real.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 text-sm text-zinc-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-400" />
            Analyzing resume against job description...
          </div>
        )}

        {analysis && !loading && (
          <div>
            <div className="flex gap-1 border-b border-zinc-800 pb-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    activeTab === tab
                      ? 'bg-indigo-500 text-white'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {activeTab === 'Missing Keywords' && (
                <div className="flex flex-wrap gap-2">
                  {analysis.missingKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {activeTab === 'Bullet Suggestions' && (
                <div className="flex flex-col gap-4">
                  {analysis.bulletSuggestions.map((b, i) => (
                    <div key={i} className="rounded-md border border-zinc-800 p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Original
                      </p>
                      <p className="mt-1 text-sm text-zinc-400 line-through decoration-zinc-600">
                        {b.original}
                      </p>
                      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-emerald-500">
                        Suggested Rewrite
                      </p>
                      <p className="mt-1 text-sm text-zinc-100">{b.suggested}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'Reality Check' && (
                <ul className="flex flex-col gap-3">
                  {analysis.realityCheck.map((item, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-red-500/20 bg-red-500/5 p-3 text-sm text-zinc-300"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
