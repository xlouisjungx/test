import type {
  AppEvent,
  AuditLog,
  HouseListing,
  PublicListing,
  SupplierProfile,
  SupplierRole,
  VisitRequest,
  VisitStatus,
} from '../types'
import { STORAGE_KEYS } from '../data/constants'
import { makeDemoListings, makeDemoVisits } from '../data/demo'
import { deriveStatus, significantSignature } from '../services/publication'
import { readJson, writeJson, uid, nowIso, type SaveResult } from './storage'

// ---------- 이벤트·감사기록 ----------
export const eventsRepo = {
  all(): AppEvent[] {
    return readJson<AppEvent[]>(STORAGE_KEYS.events, [])
  },
  log(type: string, extra: { supplierRole?: SupplierRole; listingId?: string } = {}) {
    const events = this.all()
    events.push({ id: uid(), at: nowIso(), type, ...extra })
    writeJson(STORAGE_KEYS.events, events)
  },
}

export const auditRepo = {
  all(): AuditLog[] {
    return readJson<AuditLog[]>(STORAGE_KEYS.audit, [])
  },
  log(actor: string, action: string, extra: { listingId?: string; detail?: string } = {}) {
    const logs = this.all()
    logs.push({ id: uid(), at: nowIso(), actor, action, ...extra })
    writeJson(STORAGE_KEYS.audit, logs)
  },
}

// ---------- 세션 ----------
export const sessionRepo = {
  get(): SupplierProfile | null {
    return readJson<SupplierProfile | null>(STORAGE_KEYS.session, null)
  },
  setRole(role: SupplierRole) {
    writeJson(STORAGE_KEYS.session, { role, selectedAt: nowIso() } satisfies SupplierProfile)
  },
  clear() {
    writeJson(STORAGE_KEYS.session, null)
  },
}

// ---------- 매물 ----------
function seedListings(): HouseListing[] {
  const demo = makeDemoListings()
  writeJson(STORAGE_KEYS.listings, demo)
  return demo
}

export const listingsRepo = {
  all(): HouseListing[] {
    const raw = readJson<HouseListing[] | null>(STORAGE_KEYS.listings, null)
    return raw ?? seedListings()
  },
  get(id: string): HouseListing | undefined {
    return this.all().find((l) => l.id === id)
  },
  /**
   * 저장 + 상태 자동 갱신.
   * 공개 중 매물의 주요 정보가 바뀌면 재검토 상태로 되돌리고 감사기록을 남긴다.
   */
  save(listing: HouseListing, opts: { actor?: string } = {}): SaveResult & { listing: HouseListing } {
    const all = this.all()
    const prev = all.find((l) => l.id === listing.id)
    let next: HouseListing = { ...listing, updatedAt: nowIso() }

    if (prev?.status === 'published' && next.status === 'published') {
      if (significantSignature(prev) !== significantSignature(next)) {
        next = { ...next, status: 'review_required', analysisStatus: 'review_required', review: undefined }
        auditRepo.log(opts.actor ?? 'supplier', 'published_listing_changed', {
          listingId: listing.id,
          detail: '공개 중 매물의 주요 정보가 변경되어 재검토 상태로 전환',
        })
      }
    }
    if (!['published', 'paused', 'archived'].includes(next.status)) {
      next = { ...next, status: deriveStatus(next) }
    }

    const idx = all.findIndex((l) => l.id === next.id)
    if (idx >= 0) all[idx] = next
    else all.push(next)
    const result = writeJson(STORAGE_KEYS.listings, all)
    return { ...result, listing: next }
  },
  /** 실수 방지를 위해 삭제 대신 보관 처리한다 */
  archive(id: string, actor: string): SaveResult {
    const l = this.get(id)
    if (!l) return { ok: false, error: '해당 빈집을 찾을 수 없습니다.' }
    auditRepo.log(actor, 'listing_archived', { listingId: id })
    return this.save({ ...l, status: 'archived' })
  },
  duplicate(id: string): HouseListing | undefined {
    const src = this.get(id)
    if (!src) return undefined
    const copy: HouseListing = {
      ...structuredClone(src),
      id: uid(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      status: 'draft',
      analysisStatus: 'none',
      aiResult: undefined,
      finalIssues: undefined,
      review: undefined,
      estimate: undefined,
      publishedAt: undefined,
      publishConfirmations: { privacyChecked: false, safetyNoticeChecked: false, fieldCheckChecked: false },
      basic: { ...src.basic, name: `${src.basic.name} (복제)` },
    }
    this.save(copy)
    return copy
  },
  /** 공개 중인 매물만 수요자 사이드에 노출한다 */
  published(): HouseListing[] {
    return this.all().filter((l) => l.status === 'published')
  },
}

// ---------- 방문 신청 ----------
function seedVisits(): VisitRequest[] {
  const demo = makeDemoVisits()
  writeJson(STORAGE_KEYS.visits, demo)
  return demo
}

export const visitsRepo = {
  all(): VisitRequest[] {
    const raw = readJson<VisitRequest[] | null>(STORAGE_KEYS.visits, null)
    return raw ?? seedVisits()
  },
  get(id: string): VisitRequest | undefined {
    return this.all().find((v) => v.id === id)
  },
  save(visit: VisitRequest): SaveResult {
    const all = this.all()
    const idx = all.findIndex((v) => v.id === visit.id)
    if (idx >= 0) all[idx] = visit
    else all.push(visit)
    return writeJson(STORAGE_KEYS.visits, all)
  },
  setStatus(id: string, status: VisitStatus, note?: string, patch: Partial<VisitRequest> = {}): SaveResult {
    const v = this.get(id)
    if (!v) return { ok: false, error: '해당 방문 신청을 찾을 수 없습니다.' }
    const next: VisitRequest = {
      ...v,
      ...patch,
      status,
      history: [...v.history, { at: nowIso(), status, note }],
    }
    auditRepo.log('supplier', `visit_${status}`, { listingId: v.listingId, detail: `${v.no} ${note ?? ''}`.trim() })
    return this.save(next)
  },
  byListing(listingId: string): VisitRequest[] {
    return this.all().filter((v) => v.listingId === listingId)
  },
}

// ---------- 수요자용 가져온 공개 데이터 ----------
export const importedPublicRepo = {
  all(): PublicListing[] {
    return readJson<PublicListing[]>(STORAGE_KEYS.importedPublic, [])
  },
  replace(listings: PublicListing[]): SaveResult {
    return writeJson(STORAGE_KEYS.importedPublic, listings)
  },
}
