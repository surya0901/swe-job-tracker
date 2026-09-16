// Word-level diff (classic LCS/Myers-style dynamic programming) for the
// side-by-side original/tailored review UI. Pure and deterministic — no
// AI involved in computing the diff itself, only in what text got
// proposed (see tailoring.js).

function tokenize(text) {
  // Keep whitespace as its own tokens so re-joining is exact.
  return text.match(/\S+|\s+/g) ?? []
}

export function diffWords(originalText, proposedText) {
  const a = tokenize(originalText)
  const b = tokenize(proposedText)
  const n = a.length
  const m = b.length

  // LCS table
  const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'equal', text: a[i] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      ops.push({ type: 'delete', text: a[i] })
      i++
    } else {
      ops.push({ type: 'insert', text: b[j] })
      j++
    }
  }
  while (i < n) {
    ops.push({ type: 'delete', text: a[i] })
    i++
  }
  while (j < m) {
    ops.push({ type: 'insert', text: b[j] })
    j++
  }

  // Merge adjacent same-type ops for cleaner rendering.
  const merged = []
  for (const op of ops) {
    const last = merged[merged.length - 1]
    if (last && last.type === op.type) {
      last.text += op.text
    } else {
      merged.push({ ...op })
    }
  }
  return merged
}
