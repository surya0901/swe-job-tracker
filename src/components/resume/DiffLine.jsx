import { diffWords } from '../../lib/resume/diff'

export default function DiffLine({ original, proposed }) {
  const ops = diffWords(original, proposed)
  return (
    <p className="text-sm leading-relaxed">
      {ops.map((op, i) => {
        if (op.type === 'equal') return <span key={i}>{op.text}</span>
        if (op.type === 'delete')
          return (
            <span key={i} className="bg-red-500/20 text-red-300 line-through decoration-red-400/60">
              {op.text}
            </span>
          )
        return (
          <span key={i} className="bg-emerald-500/20 text-emerald-300">
            {op.text}
          </span>
        )
      })}
    </p>
  )
}
