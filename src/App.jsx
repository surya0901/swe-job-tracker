import { useCallback, useEffect, useMemo, useState } from 'react'
import TopBar from './components/TopBar'
import FilterBar from './components/FilterBar'
import KanbanBoard from './components/KanbanBoard'
import JobTable from './components/JobTable'
import DirectoryView from './components/DirectoryView'
import JobDrawer from './components/JobDrawer'
import AddJobModal from './components/AddJobModal'
import ResumeAssistant from './components/ResumeAssistant'
import { loadCatalog } from './lib/catalog'
import { loadUserData, saveUserData } from './lib/userData'
import { mergeJobs } from './lib/mergeJobs'
import { filterJobs, sortJobs, paginate } from './lib/jobQuery'
import { downloadCsv } from './lib/csv'
import { AUTO_REFRESH_INTERVAL_MS } from './lib/constants'

const PAGE_SIZE = 25
const EMPTY_FILTERS = { industry: 'All', programType: 'All', status: 'All', location: '', availability: 'All' }

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
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [sortKey, setSortKey] = useState('discovered')
  const [page, setPage] = useState(1)

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
    try {
      await fetchCatalog()
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

  const filtered = useMemo(
    () => filterJobs(activeJobs, { search, ...filters }),
    [activeJobs, search, filters],
  )
  const sorted = useMemo(() => sortJobs(filtered, sortKey), [filtered, sortKey])
  const paged = useMemo(() => paginate(sorted, page, PAGE_SIZE), [sorted, page])

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
          applyUrl: form.applyUrl || '',
          sourceUrl: '',
          description: '',
          status: 'To Apply',
          notes: '',
          verified: false,
          discoveredAt: nowIso,
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
        onExport={() => downloadCsv(trackedJobs)}
        onAddCompany={() => setShowAddModal(true)}
        meta={catalog?.meta ?? null}
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
          <ResumeAssistant />
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
