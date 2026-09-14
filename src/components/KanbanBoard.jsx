import { useState } from 'react'
import { STATUSES } from '../data/seedCompanies'
import { STATUS_STYLES } from '../lib/statusStyles'
import CompanyCard from './CompanyCard'

export default function KanbanBoard({ companies, onOpen, onStatusChange }) {
  const [dragOverStatus, setDragOverStatus] = useState(null)

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e, status) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) onStatusChange(id, status)
    setDragOverStatus(null)
  }

  return (
    <div className="grid grid-cols-1 gap-4 overflow-x-auto pb-2 sm:grid-cols-2 lg:grid-cols-none lg:grid-flow-col lg:auto-cols-[260px]">
      {STATUSES.map((status) => {
        const items = companies.filter((c) => c.status === status)
        const style = STATUS_STYLES[status]
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOverStatus(status)
            }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, status)}
            className={`flex min-h-[200px] flex-col rounded-lg border-t-2 bg-zinc-950/40 p-2 ${style.column} ${
              dragOverStatus === status ? 'ring-2 ring-indigo-400/50' : ''
            }`}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-zinc-200">{status}</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {items.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onOpen={onOpen}
                  onDragStart={handleDragStart}
                />
              ))}
              {items.length === 0 && (
                <p className="rounded-md border border-dashed border-zinc-800 p-3 text-center text-xs text-zinc-600">
                  Drop here
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
