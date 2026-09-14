const DEFAULT_TIMEOUT_MS = 12000
const DEFAULT_RETRIES = 2

export async function fetchWithRetry(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES, ...fetchOptions } = options

  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal })
      clearTimeout(timer)
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`)
      }
      return res
    } catch (err) {
      clearTimeout(timer)
      lastError = err
      if (attempt < retries) {
        const backoffMs = 400 * 2 ** attempt + Math.random() * 200
        await new Promise((r) => setTimeout(r, backoffMs))
      }
    }
  }
  throw lastError
}

// Simple bounded-concurrency runner — avoids hammering sources and avoids
// needing an extra dependency for a scheduled CI job.
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function runNext() {
    const i = nextIndex++
    if (i >= items.length) return
    results[i] = await worker(items[i], i)
    await runNext()
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, runNext)
  await Promise.all(runners)
  return results
}
