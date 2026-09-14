import { useEffect, useMemo, useState } from 'react'
import TopBar from './components/TopBar'
import FilterBar from './components/FilterBar'
import KanbanBoard from './components/KanbanBoard'
import TableView from './components/TableView'
import CompanyDrawer from './components/CompanyDrawer'
import AddCompanyModal from './components/AddCompanyModal'
import ResumeAssistant from './components/ResumeAssistant'
import { seedCompanies } from './data/seedCompanies'
import { loadCompanies, saveCompanies } from './lib/storage'
import { fetchNewOpenings } from './lib/refreshOpenings'
import { downloadCsv } from './lib/csv'

export default function App() {
  const [companies, setCompanies] = useState(() =>
    loadCompanies(seedCompanies),
  )
  const [activeView, setActiveView] = useState('tracker') // 'tracker' | 'resume'
  const [boardView, setBoardView] = useState('kanban') // 'kanban' | 'table'
  const [selected, setSelected] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    industry: 'All',
    programType: 'All',
    status: 'All',
  })

  useEffect(() => {
    saveCompanies(companies)
  }, [companies])

  const industries = useMemo(
    () => [...new Set(companies.map((c) => c.industry))].sort(),
    [companies],
  )

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (filters.industry !== 'All' && c.industry !== filters.industry) return false
      if (filters.programType !== 'All' && c.programType !== filters.programType)
        return false
      if (filters.status !== 'All' && c.status !== filters.status) return false
      if (
        search.trim() &&
        !`${c.name} ${c.programName}`.toLowerCase().includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [companies, filters, search])

  const updateCompany = (id, patch) =>
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const deleteCompany = (id) =>
    setCompanies((prev) => prev.filter((c) => c.id !== id))

  const addCompany = (form) =>
    setCompanies((prev) => [
      {
        id: `co-${Date.now()}`,
        status: 'To Apply',
        notes: '',
        dateAdded: new Date().toISOString().slice(0, 10),
        ...form,
      },
      ...prev,
    ])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const newOpenings = await fetchNewOpenings()
      setCompanies((prev) => {
        const existingNames = new Set(prev.map((c) => c.name.toLowerCase()))
        const additions = newOpenings
          .filter((o) => !existingNames.has(o.name.toLowerCase()))
          .map((o, i) => ({
            id: `co-refresh-${Date.now()}-${i}`,
            status: 'To Apply',
            notes: '',
            url: '',
            dateAdded: new Date().toISOString().slice(0, 10),
            ...o,
          }))
        return [...additions, ...prev]
      })
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <TopBar
        activeView={activeView}
        onViewChange={setActiveView}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onExport={() => downloadCsv(companies)}
        onAddCompany={() => setShowAddModal(true)}
        count={companies.length}
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {activeView === 'tracker' ? (
          <div className="flex flex-col gap-4">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              industries={industries}
              view={boardView}
              onViewChange={setBoardView}
              search={search}
              onSearchChange={setSearch}
            />

            {boardView === 'kanban' ? (
              <KanbanBoard
                companies={filtered}
                onOpen={setSelected}
                onStatusChange={(id, status) => updateCompany(id, { status })}
              />
            ) : (
              <TableView
                companies={filtered}
                onOpen={setSelected}
                onStatusChange={(id, status) => updateCompany(id, { status })}
              />
            )}
          </div>
        ) : (
          <ResumeAssistant />
        )}
      </main>

      {selected && (
        <CompanyDrawer
          company={companies.find((c) => c.id === selected.id) ?? null}
          onClose={() => setSelected(null)}
          onUpdate={updateCompany}
          onDelete={deleteCompany}
        />
      )}

      {showAddModal && (
        <AddCompanyModal onClose={() => setShowAddModal(false)} onAdd={addCompany} />
      )}
    </div>
  )
}
