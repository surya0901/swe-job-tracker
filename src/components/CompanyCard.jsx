export default function CompanyCard({ company, onOpen, onDragStart }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => onDragStart(e, company.id)}
      onClick={() => onOpen(company)}
      className="w-full cursor-grab rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-800/80 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-zinc-100">{company.name}</p>
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-medium ${
            company.programType === 'Rotational'
              ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300'
              : 'border-zinc-600/40 bg-zinc-700/30 text-zinc-400'
          }`}
        >
          {company.programType}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-400">{company.programName}</p>
      <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>{company.industry}</span>
        <span>{company.location}</span>
      </div>
    </button>
  )
}
