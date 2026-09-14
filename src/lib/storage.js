const KEY = 'swe-tracker:companies:v1'

export function loadCompanies(fallback) {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length ? parsed : fallback
  } catch {
    return fallback
  }
}

export function saveCompanies(companies) {
  try {
    localStorage.setItem(KEY, JSON.stringify(companies))
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently, app still works in-memory
  }
}
