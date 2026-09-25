import { exportDB, importInto } from 'dexie-export-import'
import { db } from './db'

/** Full backup as one JSON file. Images are embedded as base64. */
export async function exportBackup() {
  const blob = await exportDB(db)
  const date = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `roster-backup-${date}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export type ImportMode = 'merge' | 'replace'

/**
 * merge   – adds the backup's worlds to what is already here. Rows with the same id
 *           are overwritten, so importing the same backup twice does not duplicate.
 * replace – wipes this browser's data first.
 */
export async function importBackup(file: File, mode: ImportMode) {
  await importInto(db, file, {
    clearTablesBeforeImport: mode === 'replace',
    overwriteValues: true,
    acceptVersionDiff: true,
  })
}

export async function storageEstimate() {
  const est = await navigator.storage?.estimate?.()
  return est?.usage
}
