import type { AuditLog } from '../types/supplier'
import { loadJson, saveJson } from '../utils/storage'

const KEY = 'teojabang:audit-logs:v1'
const MAX_LOGS = 500

export function appendAudit(entry: Omit<AuditLog, 'id' | 'at'>): void {
  const logs = loadJson<AuditLog[]>(KEY) ?? []
  logs.push({
    ...entry,
    id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
  })
  saveJson(KEY, logs.slice(-MAX_LOGS))
}

export function getAuditLogs(listingId?: string): AuditLog[] {
  const logs = loadJson<AuditLog[]>(KEY) ?? []
  return listingId ? logs.filter((l) => l.listingId === listingId) : logs
}
