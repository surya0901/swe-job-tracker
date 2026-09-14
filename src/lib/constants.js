export const STATUSES = [
  'To Apply',
  'Applied',
  'OA',
  'Interview',
  'Offer',
  'Rejected',
]

export const PROGRAM_TYPES = ['Rotational', 'Standard']

export const COMPANY_STATUS_LABELS = {
  connected: 'Connected',
  manual_verification_needed: 'Manual verification needed',
  source_failing: 'Source temporarily failing',
}

// A run is treated as stale if the last *successful* publish is older than
// this. The collector targets ~6h; this is deliberately looser than that
// so normal jitter doesn't constantly show a false warning — schedule
// timing is never guaranteed exactly.
export const STALE_THRESHOLD_MS = 20 * 60 * 60 * 1000

export const AUTO_REFRESH_INTERVAL_MS = 15 * 60 * 1000
