import { useMemo, useState } from 'react'
import { compareResumeToJob, requestAiTailoring } from '../../lib/resume/tailoring'
import { saveTailoredVersion } from '../../lib/resume/storage'
import DiffLine from './DiffLine'
import ResumeSectionEditor from './ResumeSectionEditor'
import ExportPanel from './ExportPanel'

const SCOPES = [
  { value: 'light', label: 'Light', desc: 'Wording and supported keywords only' },
  { value: 'balanced', label: 'Balanced', desc: 'Rewrite and reorder relevant bullets' },
  { value: 'focused', label: 'Focused', desc: 'Prioritize your most relevant verified experience' },
]

const SKILL_CATEGORY_LABELS = {
  supported_present: 'Supported — already in your resume',
  supported_differently_phrased: 'Supported — phrased differently',
  not_supported: 'Not supported by your resume',
}

export default function TailorPanel({ masterResume, trackedJobs }) {
  const [selectedJobId, setSelectedJobId] = useState('')
  const [manualJobDescription, setManualJobDescription] = useState('')
  const [scope, setScope] = useState('balanced')
  const [comparison, setComparison] = useState(null)
  const [aiState, setAiState] = useState(null) // { available, suggestions, error }
  const [acceptedBulletIds, setAcceptedBulletIds] = useState(new Set())
  const [tailoredResume, setTailoredResume] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)

  const selectedJob = trackedJobs.find((j) => j.id === selectedJobId) ?? null
  const jobDescription = selectedJob?.description?.trim() || manualJobDescription

  const canAnalyze = jobDescription.trim().length > 20

  const runAnalysis = async () => {
    const result = compareResumeToJob(masterResume, jobDescription)
    setComparison(result)
    setTailoredResume(JSON.parse(JSON.stringify(masterResume))) // working copy, master untouched
    setAcceptedBulletIds(new Set())

    const ai = await requestAiTailoring({ resume: masterResume, jobDescription, scope })
    setAiState(ai)
  }

  const reorderByRelevance = () => {
    if (!comparison || !tailoredResume) return
    const order = comparison.experienceRelevance.map((r) => r.index)
    const reordered = order.map((i) => masterResume.experience[i])
    setTailoredResume({ ...tailoredResume, experience: reordered })
  }

  const acceptAiSuggestion = (suggestion) => {
    if (!tailoredResume) return
    setTailoredResume((prev) => applySuggestion(prev, suggestion))
    setAcceptedBulletIds((prev) => new Set(prev).add(suggestion.id))
  }

  const restoreMaster = () => {
    setTailoredResume(JSON.parse(JSON.stringify(masterResume)))
    setAcceptedBulletIds(new Set())
  }

  const saveVersion = async () => {
    if (!tailoredResume) return
    setSaveStatus('saving')
    const result = await saveTailoredVersion({
      companyName: selectedJob?.companyName ?? 'Manual entry',
      jobTitle: selectedJob?.title ?? 'Untitled',
      jobId: selectedJob?.id ?? null,
      jobUrl: selectedJob?.applyUrl ?? null,
      jobDescriptionSnapshot: jobDescription,
      retrievedAt: new Date().toISOString(),
      structuredResume: tailoredResume,
      acceptedChanges: [...acceptedBulletIds],
      applicationAssociation: selectedJob?.id ?? null,
    })
    setSaveStatus(result.ok ? 'saved' : `error: ${result.error}`)
  }

  const supportedSkills = useMemo(
    () => comparison?.skillSupport.filter((s) => s.category !== 'not_supported') ?? [],
    [comparison],
  )
  const unsupportedSkills = useMemo(
    () => comparison?.skillSupport.filter((s) => s.category === 'not_supported') ?? [],
    [comparison],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h3 className="text-sm font-semibold text-zinc-200">1. Choose a job</h3>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Paste a job description manually...</option>
          {trackedJobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.companyName} — {j.title}
            </option>
          ))}
        </select>

        {selectedJob && !selectedJob.description?.trim() && (
          <p className="mt-2 text-xs text-amber-400">
            This saved job has no description text collected — paste the description below for detailed tailoring.
            A job title alone isn't enough.
          </p>
        )}

        {(!selectedJob || !selectedJob.description?.trim()) && (
          <textarea
            value={manualJobDescription}
            onChange={(e) => setManualJobDescription(e.target.value)}
            rows={6}
            placeholder="Paste the job description here..."
            className="mt-2 w-full resize-none rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
          />
        )}

        <div className="mt-3 flex items-center gap-2">
          <label className="text-xs text-zinc-500">Scope:</label>
          {SCOPES.map((s) => (
            <button
              key={s.value}
              onClick={() => setScope(s.value)}
              title={s.desc}
              className={`rounded-md border px-2 py-1 text-xs font-medium ${
                scope === s.value
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <button
          onClick={runAnalysis}
          disabled={!canAnalyze}
          className="mt-3 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
        >
          Analyze against this job
        </button>
      </div>

      {comparison && (
        <>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="text-sm font-semibold text-zinc-200">2. What's supported (our assessment)</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {supportedSkills.map((s) => (
                <span
                  key={s.skill}
                  title={SKILL_CATEGORY_LABELS[s.category] + (s.evidence ? ` — ${s.evidence}` : '')}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                >
                  {s.skill}
                  {s.category === 'supported_differently_phrased' && <span className="ml-1 text-emerald-500/70">~</span>}
                </span>
              ))}
            </div>
            {comparison.experienceRelevance[0]?.relevanceScore > 0 && (
              <button
                onClick={reorderByRelevance}
                className="mt-3 rounded-md border border-indigo-500/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20"
              >
                Reorder experience by relevance to this job
              </button>
            )}
          </div>

          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <h3 className="text-sm font-semibold text-zinc-200">Gaps — not claimed, just flagged</h3>
            <p className="mt-1 text-xs text-zinc-500">
              These JD terms don't appear in your resume text. Nothing here is added automatically — only add a
              skill yourself if you actually have real experience with it.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {unsupportedSkills.map((s) => (
                <span key={s.skill} className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                  {s.skill}
                </span>
              ))}
              {unsupportedSkills.length === 0 && <p className="text-xs text-zinc-600">No gaps detected.</p>}
            </div>
          </div>

          <AiSuggestions aiState={aiState} acceptedBulletIds={acceptedBulletIds} onAccept={acceptAiSuggestion} />

          {tailoredResume && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200">3. Review &amp; edit tailored resume</h3>
                <div className="flex gap-2">
                  <button onClick={restoreMaster} className="text-xs text-zinc-400 hover:text-zinc-200">
                    Restore master version
                  </button>
                  <button
                    onClick={saveVersion}
                    className="rounded-md bg-indigo-500 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-400"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Save this version'}
                  </button>
                </div>
              </div>
              {saveStatus === 'saved' && <p className="mt-1 text-xs text-emerald-400">Saved — associated with this application.</p>}
              {saveStatus?.startsWith('error') && <p className="mt-1 text-xs text-red-400">{saveStatus}</p>}
              <div className="mt-3">
                <ResumeSectionEditor resume={tailoredResume} onChange={setTailoredResume} />
              </div>
            </div>
          )}

          {tailoredResume && (
            <ExportPanel
              resume={tailoredResume}
              versionMeta={{ companyName: selectedJob?.companyName, jobTitle: selectedJob?.title }}
            />
          )}
        </>
      )}
    </div>
  )
}

function applySuggestion(resume, suggestion) {
  const clone = JSON.parse(JSON.stringify(resume))
  const exp = clone.experience[suggestion.entryIndex]
  if (exp) exp.bullets[suggestion.bulletIndex] = suggestion.proposedText
  return clone
}

function AiSuggestions({ aiState, acceptedBulletIds, onAccept }) {
  if (!aiState) return null

  if (!aiState.available) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
        <p className="font-medium">AI setup required</p>
        <p className="mt-1">
          No AI backend is configured (VITE_RESUME_TAILOR_API_URL), so bullet rewrite suggestions aren't available
          — generating plausible-sounding rewrites without a real model is how false claims sneak in, so this app
          never fakes that locally. The gap analysis above is real and requires no AI. See
          server/analyze-resume/ for the deployable backend and setup steps.
        </p>
      </div>
    )
  }

  if (aiState.error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
        AI backend call failed: {aiState.error}
      </div>
    )
  }

  if (!aiState.suggestions?.length) {
    return <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-500">No AI suggestions returned.</div>
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
      <h3 className="text-sm font-semibold text-zinc-200">AI-suggested bullet rewrites</h3>
      <div className="mt-2 flex flex-col gap-3">
        {aiState.suggestions.map((s) => (
          <div key={s.id} className="rounded-md border border-zinc-800 p-3">
            <DiffLine original={s.originalText} proposed={s.proposedText} />
            <p className="mt-1 text-[10px] text-zinc-500">{s.explanation}</p>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => onAccept(s)}
                disabled={acceptedBulletIds.has(s.id)}
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 disabled:opacity-40"
              >
                {acceptedBulletIds.has(s.id) ? 'Accepted' : 'Accept'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
