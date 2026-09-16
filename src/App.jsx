import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import TopBar from './components/TopBar'
import FilterBar from './components/FilterBar'
import KanbanBoard from './components/KanbanBoard'
import JobTable from './components/JobTable'
import DirectoryView from './components/DirectoryView'
import JobDrawer from './components/JobDrawer'
import AddJobModal from './components/AddJobModal'
import { loadCatalog } from './lib/catalog'
import { loadUserData, saveUserData } from './lib/userData'
import { mergeJobs } from './lib/mergeJobs'
import { filterJobs, sortJobs, paginate } from './lib/jobQuery'
import { downloadCsv } from './lib/csv'
import { AUTO_REFRESH_INTERVAL_MS } from './lib/constants'

const PAGE_SIZE = 25
const EMPTY_FILTERS = {
  industry: 'All',
  programType: 'All',
  status: 'All',
  location: '',
  availability: 'All',
  // Defaults to US per spec — "clearly visible option for all countries"
  // is the scope selector itself, always present and switchable. Unknown
  // locations are a distinct state, gated by their own toggle rather than
  // folded into US or International.
  locationScope: 'US',
  includeUnknownLocations: false,
  postedWithin: 'All',
  eligibility: 'All',
  // Uncertain ("possibly eligible") matches are real and shown, but not
  // by default — this keeps "posting is open" separate from "we're
  // confident this fits a new grad."
  includeNeedsReview: false,
}
const FILTERS_STORAGE_KEY = 'swe-tracker:filters:v1'

function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY)
    if (!raw) return EMPTY_FILTERS
    return { ...EMPTY_FILTERS, ...JSON.parse(raw) }
  } catch {
    return EMPTY_FILTERS
  }
}

// Lazy-loaded: the resume workspace pulls in pdf-lib/docx/mammoth (~370KB
// gzipped) that the job tracker itself never needs — this keeps that cost
// out of the default landing bundle, only fetched when the Resume tab is
// actually opened.
const ResumeWorkspace = lazy(() => import('./components/resume/ResumeWorkspace'))

export default function App() {
  const [catalog, setCatalog] = useState(null)
  const [catalogError, setCatalogError] = useState(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState(null)

  const [userData, setUserData] = useState(() => loadUserData())

  const [activeView, setActiveView] = useState('tracker')
  const [boardView, setBoardView] = useState('kanban')
  const [selectedJobId, setSelectedJobId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(loadSavedFilters)
  const [sortKey, setSortKey] = useState('relevance')
  const [page, setPage] = useState(1)
  const [refreshMessage, setRefreshMessage] = useState(null)

  // "New since last visit" is based on firstSeenAt vs. when this browser
  // last had the app open — captured once on mount, before we overwrite
  // it, so this session can still show what's new since last time.
  const previousVisitAtRef = useRef(userData.lastVisitAt ?? null)

  useEffect(() => {
    setUserData((prev) => ({ ...prev, lastVisitAt: new Date().toISOString() }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch {
      /* filter preferences are a convenience, fine to skip if storage fails */
    }
  }, [filters])

  const fetchCatalog = useCallback(async () => {
    try {
      const data = await loadCatalog()
      setCatalog(data)
      setCatalogError(null)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setCatalogError(message)
      throw err
    }
  }, [])

  // Initial load.
  useEffect(() => {
    setCatalogLoading(true)
    fetchCatalog().finally(() => setCatalogLoading(false))
  }, [fetchCatalog])

  // Auto-refresh while the tab is visible, without ever touching userData.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchCatalog().catch(() => {
          /* surfaced via catalogError/refreshError already */
        })
      }
    }, AUTO_REFRESH_INTERVAL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchCatalog().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchCatalog])

  useEffect(() => {
    saveUserData(userData)
  }, [userData])

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshError(null)
    setRefreshMessage(null)
    const previousLastRunAt = catalog?.meta?.lastRunAt ?? null
    const previousJobIds = new Set((catalog?.jobs ?? []).map((j) => j.id))
    try {
      const fresh = await fetchCatalog()
      if (fresh.meta.lastRunAt === previousLastRunAt) {
        setRefreshMessage({ type: 'none', text: 'No newer collection available yet.' })
      } else {
        const newCount = fresh.jobs.filter((j) => !previousJobIds.has(j.id)).length
        setRefreshMessage({
          type: 'success',
          text:
            newCount > 0
              ? `Downloaded the latest collection (${new Date(fresh.meta.lastRunAt).toLocaleString()}) — ${newCount} new job${newCount === 1 ? '' : 's'} found.`
              : `Downloaded the latest collection (${new Date(fresh.meta.lastRunAt).toLocaleString()}) — no new jobs since last check.`,
        })
      }
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : String(err))
    } finally {
      setRefreshing(false)
    }
  }

  const allJobs = useMemo(
    () => mergeJobs(catalog?.jobs ?? [], userData.overrides, userData.customJobs),
    [catalog, userData],
  )

  const industries = useMemo(
    () => [...new Set(allJobs.map((j) => j.industry).filter(Boolean))].sort(),
    [allJobs],
  )

  const trackedJobs = useMemo(() => allJobs.filter((j) => j.tracked), [allJobs])
  // "Openings" is the verified, collected dataset only — custom/manual
  // entries belong to the user's own tracker, not the browsable catalog.
  const openJobs = useMemo(
    () => allJobs.filter((j) => j.verified !== false && j.status !== 'closed'),
    [allJobs],
  )

  const activeJobs = activeView === 'openings' ? openJobs : trackedJobs

  // Country/posted-date filters are discovery filters for browsing the
  // catalog — they only apply on Openings. The Tracker always shows every
  // job the user actually chose to track, regardless of where it is or
  // when it was posted.
  const effectiveFilters = useMemo(() => {
    if (activeView === 'openings') return filters
    const {
      locationScope: _locationScope,
      includeUnknownLocations: _includeUnknownLocations,
      postedWithin: _postedWithin,
      includeNeedsReview: _includeNeedsReview,
      ...rest
    } = filters
    return { ...rest, includeNeedsReview: true } // Tracker always shows everything the user tracked
  }, [filters, activeView])

  const filtered = useMemo(
    () => filterJobs(activeJobs, { search, ...effectiveFilters }),
    [activeJobs, search, effectiveFilters],
  )
  const sorted = useMemo(() => sortJobs(filtered, sortKey), [filtered, sortKey])
  const paged = useMemo(() => paginate(sorted, page, PAGE_SIZE), [sorted, page])

  const newJobIds = useMemo(() => {
    const since = previousVisitAtRef.current
    if (!since) return new Set() // first-ever visit: nothing is "new" yet
    const sinceMs = new Date(since).getTime()
    return new Set(openJobs.filter((j) => new Date(j.firstSeenAt).getTime() > sinceMs).map((j) => j.id))
  }, [openJobs])

  const stats = useMemo(() => {
    const employerIds = new Set(openJobs.map((j) => j.companyId))
    return {
      employersWithOpenings: employerIds.size,
      matchingJobs: openJobs.length,
      resultsAfterFilters: sorted.length,
    }
  }, [openJobs, sorted])

  useEffect(() => {
    setPage(1)
  }, [search, filters, activeView])

  const updateJob = (id, patch) => {
    setUserData((prev) => {
      if (id.startsWith('custom-')) {
        return {
          ...prev,
          customJobs: prev.customJobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
        }
      }
      return {
        ...prev,
        overrides: {
          ...prev.overrides,
          [id]: { status: 'To Apply', notes: '', ...prev.overrides[id], ...patch },
        },
      }
    })
  }

  const trackJob = (id) => updateJob(id, { status: 'To Apply' })

  const removeJob = (id) => {
    setUserData((prev) => {
      if (id.startsWith('custom-')) {
        return { ...prev, customJobs: prev.customJobs.filter((j) => j.id !== id) }
      }
      const nextOverrides = { ...prev.overrides }
      delete nextOverrides[id]
      return { ...prev, overrides: nextOverrides }
    })
  }

  const addCustomJob = (form) => {
    const nowIso = new Date().toISOString()
    setUserData((prev) => ({
      ...prev,
      customJobs: [
        {
          id: `custom-${Date.now()}`,
          companyName: form.companyName,
          title: form.title || 'Manually added',
          industry: form.industry || 'Unspecified',
          programType: form.programType,
          location: form.location || 'Not specified',
          country: 'Unspecified',
          workArrangement: 'Unspecified',
          applyUrl: form.applyUrl || '',
          sourceUrl: '',
          description: '',
          status: 'To Apply',
          notes: '',
          verified: false,
          firstSeenAt: nowIso,
        },
        ...prev.customJobs,
      ],
    }))
  }

  const selectedJob = selectedJobId ? allJobs.find((j) => j.id === selectedJobId) ?? null : null

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <TopBar
        activeView={activeView}
        onViewChange={setActiveView}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        refreshError={refreshError}
        refreshMessage={refreshMessage}
        onExport={() => downloadCsv(trackedJobs)}
        onAddCompany={() => setShowAddModal(true)}
        meta={catalog?.meta ?? null}
        stats={stats}
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {catalogLoading && (
          <p className="mb-4 text-sm text-zinc-500">Loading published job dataset...</p>
        )}
        {catalogError && !catalogLoading && (
          <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            Couldn't load the collected dataset ({catalogError}). Your saved application progress
            is safe in your browser — try Refresh Openings, or check back after the next
            scheduled collection run.
          </div>
        )}

        {activeView === 'directory' ? (
          <DirectoryView companies={catalog?.companies ?? []} jobs={catalog?.jobs ?? []} />
        ) : activeView === 'resume' ? (
          <Suspense fallback={<p className="text-sm text-zinc-500">Loading resume workspace...</p>}>
            <ResumeWorkspace trackedJobs={trackedJobs} />
          </Suspense>
        ) : activeView === 'tracker' && !catalogLoading && trackedJobs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-800 py-16 text-center">
            <p className="text-zinc-300">Your tracker is empty.</p>
            <p className="max-w-sm text-sm text-zinc-500">
              Browse verified openings and add the ones you're applying to — your tracker only
              shows jobs you've actually chosen to track.
            </p>
            <button
              onClick={() => setActiveView('openings')}
              className="mt-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Browse openings
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              industries={industries}
              search={search}
              onSearchChange={setSearch}
              showStatus={activeView === 'tracker'}
              showAvailability={activeView === 'openings'}
              showDateFilters={activeView === 'openings'}
              rightSlot={
                activeView === 'tracker' ? (
                  <div className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 p-0.5">
                    {['kanban', 'table'].map((v) => (
                      <button
                        key={v}
                        onClick={() => setBoardView(v)}
                        className={`rounded px-3 py-1 text-xs font-medium capitalize transition ${
                          boardView === v ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                ) : null
              }
            />

            {activeView === 'tracker' && boardView === 'kanban' ? (
              <KanbanBoard
                jobs={filtered}
                onOpen={(job) => setSelectedJobId(job.id)}
                onStatusChange={(id, status) => updateJob(id, { status })}
                newJobIds={newJobIds}
              />
            ) : (
              <JobTable
                jobs={paged}
                totalCount={sorted.length}
                onOpen={(job) => setSelectedJobId(job.id)}
                onStatusChange={(id, status) => updateJob(id, { status })}
                showTrackAction={activeView === 'openings'}
                onTrack={trackJob}
                sortKey={sortKey}
                onSortChange={setSortKey}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                newJobIds={newJobIds}
              />
            )}
          </div>
        )}
      </main>

      {selectedJob && (
        <JobDrawer
          job={selectedJob}
          onClose={() => setSelectedJobId(null)}
          onUpdate={updateJob}
          onRemove={removeJob}
        />
      )}

      {showAddModal && <AddJobModal onClose={() => setShowAddModal(false)} onAdd={addCustomJob} />}
    </div>
  )
}
