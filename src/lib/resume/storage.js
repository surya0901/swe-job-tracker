// All resume data lives in this browser's IndexedDB only — it is never
// part of the git-tracked public/data/ dataset that gets published to
// GitHub Pages, and never leaves the browser unless the user explicitly
// triggers AI tailoring with a backend configured (see tailoring.js).
//
// This is local-first, single-browser storage: it does NOT sync across
// devices or browsers. Export/import (see exportBackup/importBackup)
// is the only way to move data between them.

const DB_NAME = 'swe-tracker-resumes'
const DB_VERSION = 1
const STORE_MASTER = 'masterResume'
const STORE_TAILORED = 'tailoredVersions'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_MASTER)) {
        db.createObjectStore(STORE_MASTER, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_TAILORED)) {
        db.createObjectStore(STORE_TAILORED, { keyPath: 'id', autoIncrement: true })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName)
}

function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ---- master resume ------------------------------------------------------

export async function loadMasterResume() {
  try {
    const db = await openDb()
    const record = await promisify(tx(db, STORE_MASTER, 'readonly').get('current'))
    return record ?? null
  } catch (err) {
    return { error: describeStorageError(err) }
  }
}

export async function saveMasterResume(structuredResume, meta = {}) {
  try {
    const db = await openDb()
    const existing = await promisify(tx(db, STORE_MASTER, 'readonly').get('current'))
    const version = (existing?.version ?? 0) + 1
    const record = {
      id: 'current',
      structuredResume,
      version,
      updatedAt: new Date().toISOString(),
      sourceFileName: meta.sourceFileName ?? existing?.sourceFileName ?? null,
      sourceFileType: meta.sourceFileType ?? existing?.sourceFileType ?? null,
    }
    await promisify(tx(db, STORE_MASTER, 'readwrite').put(record))
    return { ok: true, record }
  } catch (err) {
    return { ok: false, error: describeStorageError(err) }
  }
}

export async function deleteMasterResume() {
  try {
    const db = await openDb()
    await promisify(tx(db, STORE_MASTER, 'readwrite').delete('current'))
    return { ok: true }
  } catch (err) {
    return { ok: false, error: describeStorageError(err) }
  }
}

// ---- tailored versions ----------------------------------------------------

export async function saveTailoredVersion(record) {
  try {
    const db = await openDb()
    const id = await promisify(
      tx(db, STORE_TAILORED, 'readwrite').add({
        ...record,
        createdAt: record.createdAt ?? new Date().toISOString(),
      }),
    )
    return { ok: true, id }
  } catch (err) {
    return { ok: false, error: describeStorageError(err) }
  }
}

export async function updateTailoredVersion(id, patch) {
  try {
    const db = await openDb()
    const store = tx(db, STORE_TAILORED, 'readwrite')
    const existing = await promisify(store.get(id))
    if (!existing) return { ok: false, error: 'Version not found.' }
    await promisify(store.put({ ...existing, ...patch, id }))
    return { ok: true }
  } catch (err) {
    return { ok: false, error: describeStorageError(err) }
  }
}

export async function listTailoredVersions() {
  try {
    const db = await openDb()
    const all = await promisify(tx(db, STORE_TAILORED, 'readonly').getAll())
    return all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch {
    return []
  }
}

export async function getTailoredVersion(id) {
  try {
    const db = await openDb()
    return (await promisify(tx(db, STORE_TAILORED, 'readonly').get(id))) ?? null
  } catch {
    return null
  }
}

export async function deleteTailoredVersion(id) {
  try {
    const db = await openDb()
    await promisify(tx(db, STORE_TAILORED, 'readwrite').delete(id))
    return { ok: true }
  } catch (err) {
    return { ok: false, error: describeStorageError(err) }
  }
}

// ---- backup / restore -----------------------------------------------------

export async function exportBackup() {
  const master = await loadMasterResume()
  const tailored = await listTailoredVersions()
  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    masterResume: master?.error ? null : master,
    tailoredVersions: tailored,
  }
}

export async function importBackup(backup) {
  if (!backup || backup.schemaVersion !== 1) {
    return { ok: false, error: 'Unrecognized backup format.' }
  }
  try {
    const db = await openDb()
    if (backup.masterResume) {
      await promisify(tx(db, STORE_MASTER, 'readwrite').put(backup.masterResume))
    }
    const store = tx(db, STORE_TAILORED, 'readwrite')
    for (const version of backup.tailoredVersions ?? []) {
      await promisify(store.put(version))
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: describeStorageError(err) }
  }
}

function describeStorageError(err) {
  if (err?.name === 'QuotaExceededError') {
    return 'Your browser storage is full. Export a backup, then delete old tailored versions to free space.'
  }
  return err instanceof Error ? err.message : String(err)
}
