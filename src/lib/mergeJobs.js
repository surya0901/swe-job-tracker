// Combines the read-only catalog (from the network) with the user's local
// overrides/custom jobs into the list the UI renders. Catalog jobs default
// to "To Apply" and empty notes when the user hasn't touched them — no
// user data is ever written unless they actually change something, and
// nothing about a job's catalog fields (title, company, dates, etc.) is
// ever persisted client-side.
export function mergeJobs(catalogJobs, overrides, customJobs) {
  const fromCatalog = catalogJobs.map((job) => {
    const override = overrides[job.id]
    return {
      ...job,
      status: override?.status ?? 'To Apply',
      notes: override?.notes ?? '',
      tracked: Boolean(override),
    }
  })

  const fromCustom = customJobs.map((job) => ({ ...job, tracked: true }))

  return [...fromCatalog, ...fromCustom]
}
