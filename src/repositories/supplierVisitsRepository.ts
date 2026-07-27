import { SEED_VISITS } from '../data/supplierSeed'
import type { SupplierVisit, VisitStatus } from '../types/supplier'
import { loadJson, saveJson } from '../utils/storage'
import { appendAudit } from './auditRepository'
import { getVisitRequests } from './visitRepository'

/**
 * 공급자용 방문 신청 저장소.
 * 수요자 사이드에서 접수된 신청(tjb 방문 신청 저장소)을 함께 읽어 관리한다.
 * 실제 문자·이메일은 발송하지 않으며 상태 변경만 저장한다.
 */

const KEY = 'teojabang:visits:v1'
const SEED_FLAG = 'teojabang:visits-seeded:v1'

function readAll(): SupplierVisit[] {
  return loadJson<SupplierVisit[]>(KEY) ?? []
}

function writeAll(visits: SupplierVisit[]): boolean {
  return saveJson(KEY, visits)
}

function ensureSeeded(): void {
  if (loadJson<boolean>(SEED_FLAG)) return
  const existing = readAll()
  const ids = new Set(existing.map((v) => v.id))
  writeAll([...existing, ...SEED_VISITS.filter((s) => !ids.has(s.id))])
  saveJson(SEED_FLAG, true)
}

/** 수요자 사이드에서 새로 접수된 신청을 공급자 목록으로 동기화 */
function syncFromDemandSide(): void {
  const visits = readAll()
  const ids = new Set(visits.map((v) => v.id))
  let changed = false
  for (const r of getVisitRequests()) {
    if (ids.has(r.id)) continue
    visits.push({
      id: r.id,
      houseId: r.houseId,
      houseName: r.houseName,
      name: r.name,
      phone: r.phone,
      contact: r.contact,
      visitDate: r.visitDate,
      timeSlot: r.timeSlot,
      companions: r.companions,
      questions: r.questions,
      createdAt: r.createdAt,
      status: '신청 접수',
      supplierMemo: '',
      confirmedDate: '',
      proposedDate: '',
      rejectReason: '',
      updatedAt: r.createdAt,
      isDemo: false,
    })
    changed = true
  }
  if (changed) writeAll(visits)
}

export function getSupplierVisits(): SupplierVisit[] {
  ensureSeeded()
  syncFromDemandSide()
  return readAll().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getSupplierVisitById(id: string): SupplierVisit | null {
  return getSupplierVisits().find((v) => v.id === id) ?? null
}

export function updateVisit(
  id: string,
  patch: Partial<Pick<SupplierVisit, 'status' | 'supplierMemo' | 'confirmedDate' | 'proposedDate' | 'rejectReason'>>,
  actor: string,
): SupplierVisit | null {
  const visits = readAll()
  const idx = visits.findIndex((v) => v.id === id)
  if (idx < 0) return null
  visits[idx] = { ...visits[idx], ...patch, updatedAt: new Date().toISOString() }
  writeAll(visits)
  appendAudit({
    actor,
    action: patch.status ? `방문 신청 상태 변경 → ${patch.status}` : '방문 신청 메모 수정',
    listingId: visits[idx].houseId,
    detail: `신청번호 ${id}${patch.rejectReason ? ` / 사유: ${patch.rejectReason}` : ''}`,
  })
  return visits[idx]
}

export function countByStatus(): Record<VisitStatus, number> {
  const counts = {
    '신청 접수': 0,
    '확인 중': 0,
    '방문 확정': 0,
    '일정 변경 요청': 0,
    '방문 거절': 0,
    '방문 완료': 0,
    '신청 취소': 0,
  } as Record<VisitStatus, number>
  for (const v of getSupplierVisits()) counts[v.status]++
  return counts
}
