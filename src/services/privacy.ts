import type { AccessLevel, House, Level, PhotoAnalysisItem, Region } from '../types'
import { REGIONS } from '../types'
import type { HouseListing, ReviewedIssue } from '../types/supplier'
import { estimateTotals, itemCost } from './repair-cost'

/**
 * 공개용 데이터 변환·민감정보 분리.
 * 공급자 listing에서 수요자 사이드 House 스키마로 변환하며,
 * 소유자 정보·상세주소·내부 메모 등 민감정보는 절대 포함하지 않는다.
 */

const kmToAccess = (km: number): AccessLevel => (km <= 0 ? '보통' : km <= 3 ? '좋음' : km <= 8 ? '보통' : '아쉬움')

function sufficiencyToConfidence(s: ReviewedIssue['photoSufficiency']): PhotoAnalysisItem['photoConfidence'] {
  return s === '충분' ? '충분' : s === '부분 확인' ? '보통' : '부족'
}

function deriveBurden(issues: ReviewedIssue[]): Level {
  const active = issues.filter((i) => !i.excluded)
  if (active.some((i) => i.burden === '높음')) return '높음'
  if (active.some((i) => i.burden === '보통')) return '보통'
  return '낮음'
}

/** 공개용 위치 문자열 — 상세주소는 공개하지 않는다 */
export function publicLocation(listing: HouseListing): Region {
  // House 스키마는 읍·면 단위 Region만 사용한다 ('기타'는 공개 변환 불가)
  return listing.basic.region as Region
}

/** 공급자 listing → 수요자 House 변환 (민감정보 제거) */
export function toPublicHouse(listing: HouseListing): House {
  const finalIssues = (listing.review?.finalIssues ?? []).filter((i) => !i.excluded)
  const estimate = listing.estimate?.items ?? []

  const photoAnalysis: PhotoAnalysisItem[] = finalIssues.map((i) => ({
    part: i.part,
    observation: i.feature,
    repairLikelihood: i.likelihood,
    burden: i.burden,
    note: i.note,
    photoConfidence: sufficiencyToConfidence(i.photoSufficiency),
    needsSiteCheck: i.needsSiteCheck,
  }))

  const totals = estimateTotals(estimate)

  return {
    id: listing.id,
    name: listing.basic.name,
    summary: listing.farm.note || `${listing.basic.region}의 ${listing.basic.houseType || '농가주택'} 매물이에요.`,
    region: publicLocation(listing),
    areaM2: listing.basic.floorAreaM2,
    builtYear: listing.basic.builtYear,
    dealType: listing.transaction.dealType || '협의',
    deposit: listing.transaction.deposit,
    monthlyRent: listing.transaction.monthlyRent,
    photos: listing.photos
      .filter((p) => p.isPublic)
      .map((p) => ({ id: p.id, label: p.category })),
    farmDistanceKm: listing.farm.farmDistanceKm,
    farmTravelMinutes: listing.farm.farmTravelMinutes,
    truckAccess: listing.farm.truckAccess,
    truckAccessNote:
      listing.farm.roadWidthM > 0 ? `진입로 폭 약 ${listing.farm.roadWidthM}m (공급자 제공 정보)` : '진입로 정보는 현장 확인이 필요합니다.',
    machineAccess: listing.farm.machineAccess,
    parking: listing.farm.parkingCount > 0 ? 'yes' : 'unknown',
    parkingNote: listing.farm.parkingCount > 0 ? `약 ${listing.farm.parkingCount}대 주차 가능` : '주차 가능 여부 확인 필요',
    hasStorage: listing.farm.hasStorage,
    storageNote: listing.farm.hasStorage ? `약 ${listing.farm.storageAreaM2}㎡ 창고` : '별도 창고 없음',
    hasYard: listing.farm.hasYard,
    yardNote: listing.farm.hasYard ? `약 ${listing.farm.yardAreaM2}㎡ 마당` : '마당 없음',
    utilities: {
      water: listing.living.water,
      electricity: listing.living.electricity,
      heating: listing.living.boilerChecked,
      internet: listing.living.internetAvailable,
    },
    utilityNote: listing.living.heatingType ? `난방: ${listing.living.heatingType} (작동 여부는 현장 확인 필요)` : '설비 상태는 현장 확인이 필요합니다.',
    transitAccess: listing.living.busStopM > 0 && listing.living.busStopM <= 500 ? '좋음' : listing.living.busStopM <= 1500 ? '보통' : '아쉬움',
    amenityAccess: kmToAccess(listing.living.martKm),
    repairBurden: deriveBurden(listing.review?.finalIssues ?? []),
    photoAnalysis,
    repairItems: estimate
      .filter((i) => !i.needsSiteQuote)
      .map((i) => {
        const c = itemCost(i)
        return { name: i.name, minCost: c.min, maxCost: c.max, basis: i.basis }
      }),
    unknownFromPhotos: [
      ...(listing.analysis?.unknowns ?? []),
      ...totals.siteQuoteItems.map((n) => `${n} (현장견적 필요)`),
    ],
    extraSiteChecks: listing.fieldChecks.filter((f) => f.source !== 'default').map((f) => f.label),
    isDemo: true,
  }
}

/** 공개 JSON에 포함되면 안 되는 민감 값 수집 */
export function sensitiveValues(listing: HouseListing): string[] {
  return [
    listing.consent.ownerName,
    listing.consent.ownerContact,
    listing.consent.consentEvidenceName,
    listing.consent.registrantName,
    listing.consent.registrantContact,
    listing.basic.fullAddress,
    listing.internalMemo,
  ].filter((v) => v.trim().length > 1)
}

/** 직렬화된 공개 데이터에 민감정보가 남아 있는지 검사 */
export function containsSensitiveInfo(json: string, listing: HouseListing): string[] {
  return sensitiveValues(listing).filter((v) => json.includes(v))
}

export interface PublicExport {
  schema: 'teojabang-public-houses'
  version: 1
  exportedAt: string
  houses: House[]
}

export function buildPublicExport(listings: HouseListing[]): PublicExport {
  return {
    schema: 'teojabang-public-houses',
    version: 1,
    exportedAt: new Date().toISOString(),
    houses: listings.map(toPublicHouse),
  }
}

/** 수요자용 공개 데이터 스키마 검증 */
export function validatePublicExport(value: unknown): value is PublicExport {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.schema !== 'teojabang-public-houses' || v.version !== 1) return false
  if (!Array.isArray(v.houses)) return false
  return v.houses.every((raw) => {
    if (typeof raw !== 'object' || raw === null) return false
    const h = raw as Record<string, unknown>
    return (
      typeof h.id === 'string' &&
      typeof h.name === 'string' &&
      REGIONS.includes(h.region as Region) &&
      typeof h.deposit === 'number' &&
      typeof h.monthlyRent === 'number' &&
      Array.isArray(h.photoAnalysis) &&
      Array.isArray(h.repairItems) &&
      Array.isArray(h.unknownFromPhotos)
    )
  })
}
