import { SEED_LISTINGS, defaultFieldChecks } from '../data/supplierSeed'
import { needsRereview } from '../services/publication'
import type { HouseListing, ListingStatus, SupplierType } from '../types/supplier'
import { loadJson, saveJson } from '../utils/storage'
import { appendAudit } from './auditRepository'

/** 빈집 매물 저장소 (localStorage 기반, 추후 API로 교체 가능) */

const KEY = 'teojabang:listings:v1'
const SEED_FLAG = 'teojabang:listings-seeded:v1'

function readAll(): HouseListing[] {
  return loadJson<HouseListing[]>(KEY) ?? []
}

function writeAll(listings: HouseListing[]): boolean {
  return saveJson(KEY, listings)
}

export function ensureSeeded(): void {
  if (loadJson<boolean>(SEED_FLAG)) return
  const existing = readAll()
  const ids = new Set(existing.map((l) => l.id))
  const merged = [...existing, ...SEED_LISTINGS.filter((s) => !ids.has(s.id))]
  writeAll(merged)
  saveJson(SEED_FLAG, true)
}

export function getListings(): HouseListing[] {
  ensureSeeded()
  return readAll()
}

export function getListingById(id: string): HouseListing | null {
  return getListings().find((l) => l.id === id) ?? null
}

export function getPublishedListings(): HouseListing[] {
  return getListings().filter((l) => l.status === 'published')
}

export function saveListing(listing: HouseListing, actor: string, action = '매물 저장'): { ok: boolean; rereviewed: boolean } {
  const all = getListings()
  const idx = all.findIndex((l) => l.id === listing.id)
  const prev = idx >= 0 ? all[idx] : null
  let next: HouseListing = { ...listing, updatedAt: new Date().toISOString() }
  let rereviewed = false

  // 공개 중 매물의 주요 정보가 바뀌면 재검토 상태로 전환
  if (prev && needsRereview(prev, next)) {
    next = {
      ...next,
      status: 'review_required',
      review: next.review ? { ...next.review, status: 'pending' } : null,
      estimate: next.estimate ? { ...next.estimate, reviewed: false } : null,
    }
    rereviewed = true
  }

  if (idx >= 0) all[idx] = next
  else all.push(next)

  const ok = writeAll(all)
  if (ok) appendAudit({ actor, action: rereviewed ? `${action} (주요 변경 → 재검토 전환)` : action, listingId: listing.id, detail: '' })
  return { ok, rereviewed }
}

export function setListingStatus(id: string, status: ListingStatus, actor: string, detail = ''): HouseListing | null {
  const all = getListings()
  const idx = all.findIndex((l) => l.id === id)
  if (idx < 0) return null
  all[idx] = { ...all[idx], status, updatedAt: new Date().toISOString() }
  writeAll(all)
  appendAudit({ actor, action: `상태 변경 → ${status}`, listingId: id, detail })
  return all[idx]
}

export function duplicateListing(id: string, actor: string): HouseListing | null {
  const source = getListingById(id)
  if (!source) return null
  const copy: HouseListing = {
    ...structuredClone(source),
    id: `listing-${Date.now().toString(36)}`,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    analysis: null,
    review: null,
    estimate: null,
    isDemo: source.isDemo,
  }
  copy.basic = { ...copy.basic, name: `${copy.basic.name} (복제)` }
  const all = getListings()
  all.push(copy)
  writeAll(all)
  appendAudit({ actor, action: '복제 등록', listingId: copy.id, detail: `원본: ${id}` })
  return copy
}

export function newEmptyListing(supplierType: SupplierType): HouseListing {
  const now = new Date().toISOString()
  return {
    id: `listing-${Date.now().toString(36)}`,
    version: 1,
    createdAt: now,
    updatedAt: now,
    status: 'draft',
    supplierType,
    consent: {
      isOwnerSelf: supplierType === '빈집 소유자',
      ownerName: '',
      ownerContact: '',
      utilizationIntent: '',
      consentConfirmed: false,
      consentDate: '',
      consentEvidenceName: '',
      registrantName: '',
      registrantOrg: '',
      registrantContact: '',
    },
    basic: {
      name: '',
      region: '애월읍',
      fullAddress: '',
      addressDisclosure: '읍·면까지만 공개',
      houseType: '농가주택',
      floorAreaM2: 0,
      landAreaM2: 0,
      builtYear: 0,
      rooms: 0,
      baths: 0,
      floors: 1,
      vacancyMonths: 0,
      gradeInfo: '',
      buildingRegisterChecked: false,
      accessible: 'unknown',
      habitability: '',
    },
    transaction: {
      dealType: '',
      deposit: 0,
      monthlyRent: 0,
      salePrice: 0,
      maintenanceFee: 0,
      minContractMonths: 0,
      moveInDate: '',
      priceNegotiable: false,
      publicProgramLinked: false,
      extraTerms: '',
      agentName: '',
    },
    farm: {
      nearbyCrops: [],
      farmDistanceKm: 0,
      farmTravelMinutes: 0,
      farmLinkAvailable: 'unknown',
      truckAccess: 'unknown',
      machineAccess: 'unknown',
      roadWidthM: 0,
      turnaround: 'unknown',
      parkingCount: 0,
      hasStorage: false,
      storageAreaM2: 0,
      farmStorage: 'unknown',
      hasYard: false,
      yardAreaM2: 0,
      outdoorWater: 'unknown',
      workspace: 'unknown',
      note: '',
    },
    living: {
      water: 'unknown',
      groundwater: 'unknown',
      electricity: 'unknown',
      heatingType: '',
      boilerChecked: 'unknown',
      internetAvailable: 'unknown',
      septic: 'unknown',
      wasteDisposal: '',
      busStopM: 0,
      martKm: 0,
      hospitalKm: 0,
      townCenterKm: 0,
      neighborM: 0,
      mobileSignal: '확인되지 않음',
      note: '',
    },
    photos: [],
    photoNA: [],
    analysis: null,
    review: null,
    estimate: null,
    fieldChecks: defaultFieldChecks(),
    internalMemo: '',
    isDemo: true,
  }
}
