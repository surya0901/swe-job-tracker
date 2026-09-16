import { useEffect, useState } from 'react'
import ResumeUpload from './ResumeUpload'
import ResumeSectionEditor from './ResumeSectionEditor'
import TailorPanel from './TailorPanel'
import ExportPanel from './ExportPanel'
import {
  loadMasterResume,
  saveMasterResume,
  deleteMasterResume,
  listTailoredVersions,
  deleteTailoredVersion,
  exportBackup,
  importBackup,
} from '../../lib/resume/storage'
import { downloadJsonFile } from '../../lib/resume/textExport'

const EMPTY_RESUME = {
  contact: { name: '', email: '', phone: '', links: [] },
  summary: '',
  education: [],
  experience: [],
  projects: [],
  skills: [],
  certifications: [],
  additionalSections: [],
}

export default function ResumeWorkspace({ trackedJobs }) {
  const [view, setView] = useState('master') // master | tailor | versions
  const [master, setMaster] = useState(null) // { structuredResume, version, updatedAt, ... } | null
  const [draft, setDraft] = useState(null) // working copy while editing
  const [extractionWarnings, setExtractionWarnings] = useState([])
  const [saveStatus, setSaveStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [storageError, setStorageError] = useState(null)
  const [versions, setVersions] = useState([])
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    loadMasterResume().then((record) => {
      if (record?.error) {
        setStorageError(record.error)
      } else if (record) {
        setMaster(record)
        setDraft(record.structuredResume)
      }
      setLoading(false)
    })
    listTailoredVersions().then(setVersions)
  }, [])

  // Refresh the saved-versions list whenever that tab is opened — a
  // version saved from the Tailor tab wouldn't otherwise show up here
  // without a full reload, since it's fetched once on mount.
  useEffect(() => {
    if (view === 'versions') listTailoredVersions().then(setVersions)
  }, [view])

  const handleExtracted = (parsed, meta) => {
    setDraft(parsed)
    setExtractionWarnings(parsed.warnings)
    setMaster((prev) => ({ ...(prev ?? {}), sourceFileName: meta.sourceFileName, sourceFileType: meta.sourceFileType }))
  }

  const saveAsMaster = async () => {
    if (!draft) return
    setSaveStatus('saving')
    const result = await saveMasterResume(draft, {
      sourceFileName: master?.sourceFileName,
      sourceFileType: master?.sourceFileType,
    })
    if (result.ok) {
      setMaster(result.record)
      setSaveStatus('saved')
    } else {
      setSaveStatus(`error: ${result.error}`)
    }
  }

  const startFromScratch = () => {
    setDraft(EMPTY_RESUME)
    setExtractionWarnings([])
  }

  const handleDeleteMaster = async () => {
    await deleteMasterResume()
    setMaster(null)
    setDraft(null)
    setConfirmingDelete(false)
  }

  const handleExportBackup = async () => {
    const backup = await exportBackup()
    downloadJsonFile(backup, 'swe-tracker-resume-backup.json')
  }

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      const result = await importBackup(backup)
      if (result.ok) {
        const record = await loadMasterResume()
        if (record && !record.error) {
          setMaster(record)
          setDraft(record.structuredResume)
        }
        listTailoredVersions().then(setVersions)
      } else {
        setStorageError(result.error)
      }
    } catch {
      setStorageError('Could not read that backup file — is it a valid JSON export from this app?')
    }
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading your resume data...</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
        <p className="text-xs text-zinc-500">
          Your resume data is stored only in this browser (not synced across devices, not part of the public job
          dataset, never committed to GitHub). Export a backup periodically — clearing site data or switching
          browsers will lose it otherwise.
        </p>
        <div className="mt-2 flex gap-2">
          <button onClick={handleExportBackup} className="text-xs text-indigo-400 hover:text-indigo-300">
            Export backup (JSON)
          </button>
          <label className="cursor-pointer text-xs text-indigo-400 hover:text-indigo-300">
            Import backup
            <input type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
          </label>
        </div>
      </div>

      {storageError && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Storage error: {storageError}
        </p>
      )}

      <div className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 p-0.5 self-start">
        {['master', 'tailor', 'versions'].map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            disabled={v !== 'master' && !master}
            className={`rounded px-3 py-1.5 text-xs font-medium capitalize transition disabled:opacity-30 ${
              view === v ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {v === 'master' ? 'Master Resume' : v === 'tailor' ? 'Tailor' : 'Saved Versions'}
          </button>
        ))}
      </div>

      {view === 'master' && (
        <>
          {!draft && (
            <div className="flex flex-col gap-3">
              <ResumeUpload onExtracted={handleExtracted} />
              <button onClick={startFromScratch} className="self-start text-xs text-indigo-400 hover:text-indigo-300">
                Or build a resume from scratch
              </button>
            </div>
          )}

          {draft && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-500">
                  {master?.version ? `Master resume v${master.version} — saved ${new Date(master.updatedAt).toLocaleString()}` : 'Unsaved draft'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setDraft(null)} className="text-xs text-zinc-400 hover:text-zinc-200">
                    Upload a different file
                  </button>
                  <button
                    onClick={saveAsMaster}
                    className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
                  >
                    {saveStatus === 'saving' ? 'Saving...' : 'Save as master resume'}
                  </button>
                </div>
              </div>
              {saveStatus === 'saved' && <p className="text-xs text-emerald-400">Saved. This is now your source of truth for tailoring.</p>}
              {saveStatus?.startsWith('error') && <p className="text-xs text-red-400">{saveStatus}</p>}

              <ResumeSectionEditor resume={draft} onChange={setDraft} warnings={extractionWarnings} />

              {master && <ExportPanel resume={draft} />}

              {master && (
                <div className="mt-2">
                  {!confirmingDelete ? (
                    <button onClick={() => setConfirmingDelete(true)} className="text-xs text-red-400 hover:text-red-300">
                      Delete master resume
                    </button>
                  ) : (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                      This deletes your saved master resume from this browser permanently. Export a backup first if
                      you want to keep it.
                      <div className="mt-1 flex gap-2">
                        <button onClick={handleDeleteMaster} className="font-medium underline">
                          Yes, delete it
                        </button>
                        <button onClick={() => setConfirmingDelete(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === 'tailor' && master && <TailorPanel masterResume={master.structuredResume} trackedJobs={trackedJobs} />}

      {view === 'versions' && (
        <SavedVersions
          versions={versions}
          onDelete={async (id) => {
            await deleteTailoredVersion(id)
            listTailoredVersions().then(setVersions)
          }}
        />
      )}
    </div>
  )
}

function SavedVersions({ versions, onDelete }) {
  if (versions.length === 0) {
    return <p className="text-sm text-zinc-500">No tailored versions saved yet.</p>
  }
  return (
    <div className="flex flex-col gap-2">
      {versions.map((v) => (
        <div key={v.id} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">
                {v.companyName} — {v.jobTitle}
              </p>
              <p className="text-xs text-zinc-500">
                Saved {new Date(v.createdAt).toLocaleString()} · {v.acceptedChanges?.length ?? 0} accepted change
                {v.acceptedChanges?.length === 1 ? '' : 's'}
              </p>
            </div>
            <button onClick={() => onDelete(v.id)} className="text-xs text-red-400 hover:text-red-300">
              Delete
            </button>
          </div>
          <ExportPanel resume={v.structuredResume} versionMeta={{ companyName: v.companyName, jobTitle: v.jobTitle }} />
        </div>
      ))}
    </div>
  )
}
