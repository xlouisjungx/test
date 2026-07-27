import type { HouseListing, PublicExportPayload, PublicListing } from '../types'
import { ESTIMATE_DISCLAIMER, SAFETY_NOTICE } from '../data/constants'
import { nowIso } from '../repositories/storage'

/** 공개 데이터에 절대 포함되면 안 되는 키 */
export const FORBIDDEN_PUBLIC_KEYS = [
  'ownerName',
  'ownerContact',
  'evidenceFileName',
  'managerName',
  'managerOrg',
  'managerContact',
  'consent',
  'addressDetail',
  'internalMemo',
  'supplierMemo',
  'applicantContact',
  'agentName',
  'fileName',
  'editReason',
] as const

/** 객체 트리에서 금지 키를 재귀적으로 찾는다 */
export function findSensitiveKeys(value: unknown, path = ''): string[] {
  if (value == null || typeof value !== 'object') return []
  const found: string[] = []
  if (Array.isArray(value)) {
    value.forEach((v, i) => found.push(...findSensitiveKeys(v, `${path}[${i}]`)))
    return found
  }
  for (const [k, v] of Object.entries(value)) {
    const p = path ? `${path}.${k}` : k
    if ((FORBIDDEN_PUBLIC_KEYS as readonly string[]).includes(k)) found.push(p)
    found.push(...findSensitiveKeys(v, p))
  }
  return found
}

export function publicAddressOf(listing: HouseListing): string {
  const { region, ri, addressPublicLevel } = listing.basic
  if (addressPublicLevel === 'ri' && ri) return `제주 ${region} ${ri}`
  if (addressPublicLevel === 'after_visit') return `제주 ${region} (상세 위치는 방문 확정 후 공개)`
  return `제주 ${region}`
}

/** 민감정보를 제거한 수요자 공개용 데이터로 변환 */
export function toPublicListing(listing: HouseListing): PublicListing {
  const issues = (listing.finalIssues ?? []).filter((i) => !i.excluded)
  const { agentName: _agentName, ...transaction } = listing.transaction
  return {
    schemaVersion: 1,
    id: listing.id,
    name: listing.basic.name,
    publicAddress: publicAddressOf(listing),
    addressPublicLevel: listing.basic.addressPublicLevel,
    houseType: listing.basic.houseType,
    floorAreaM2: listing.basic.floorAreaM2,
    landAreaM2: listing.basic.landAreaM2,
    builtYear: listing.basic.builtYear,
    rooms: listing.basic.rooms,
    baths: listing.basic.baths,
    floors: listing.basic.floors,
    vacantMonths: listing.basic.vacantMonths,
    livableOpinion: listing.basic.livableOpinion,
    transaction,
    farm: listing.farm,
    living: listing.living,
    photos: listing.photos
      .filter((p) => p.isPublic)
      .sort((a, b) => a.order - b.order)
      .map((p) => ({
        id: p.id,
        category: p.category,
        dataUrl: p.dataUrl,
        caption: p.caption,
        isPrimary: p.isPrimary,
      })),
    issues: issues.map((i) => ({
      id: i.id,
      area: i.area,
      location: i.location,
      observation: i.observation,
      suspectedRepairs: i.suspectedRepairs,
      repairLikelihood: i.repairLikelihood,
      burden: i.burden,
      sufficiency: i.sufficiency,
      confidence: i.confidence,
      needsFieldCheck: i.needsFieldCheck,
      note: i.note,
    })),
    uncheckable: listing.aiResult?.uncheckable ?? [],
    estimate: listing.estimate
      ? {
          items: listing.estimate.items.map((i) => ({
            label: i.label,
            unit: i.unit,
            quantity: i.quantity,
            minCostManwon: i.minCostManwon,
            maxCostManwon: i.maxCostManwon,
            basis: i.basis,
            needsFieldQuote: i.needsFieldQuote,
          })),
          totalMinManwon: listing.estimate.totalMinManwon,
          totalMaxManwon: listing.estimate.totalMaxManwon,
        }
      : undefined,
    fieldCheck: listing.fieldCheckItems.map((f) => f.label),
    isDemoAnalysis: listing.aiResult?.isDemo ?? false,
    disclaimers: [ESTIMATE_DISCLAIMER, SAFETY_NOTICE],
    isDemo: listing.isDemo,
    publishedAt: listing.publishedAt ?? nowIso(),
  }
}

/** 공개된 매물만 민감정보 제거 후 내보낸다 */
export function buildExportPayload(listings: HouseListing[]): PublicExportPayload {
  return {
    schemaVersion: 1,
    exportedAt: nowIso(),
    listings: listings.filter((l) => l.status === 'published').map(toPublicListing),
  }
}

/** 가져오기·내보내기 시 공개 데이터 스키마 검증 */
export function validatePublicPayload(data: unknown): string[] {
  const errors: string[] = []
  if (data == null || typeof data !== 'object') return ['JSON 최상위가 객체가 아닙니다.']
  const d = data as Record<string, unknown>
  if (d.schemaVersion !== 1) errors.push('schemaVersion이 1이 아닙니다.')
  if (!Array.isArray(d.listings)) {
    errors.push('listings 배열이 없습니다.')
    return errors
  }
  d.listings.forEach((raw, idx) => {
    if (raw == null || typeof raw !== 'object') {
      errors.push(`listings[${idx}]가 객체가 아닙니다.`)
      return
    }
    const l = raw as Record<string, unknown>
    if (typeof l.id !== 'string' || l.id.length === 0) errors.push(`listings[${idx}].id가 없습니다.`)
    if (typeof l.name !== 'string' || l.name.length === 0) errors.push(`listings[${idx}].name이 없습니다.`)
    if (typeof l.publicAddress !== 'string') errors.push(`listings[${idx}].publicAddress가 없습니다.`)
    if (!Array.isArray(l.photos)) errors.push(`listings[${idx}].photos가 배열이 아닙니다.`)
    if (!Array.isArray(l.issues)) errors.push(`listings[${idx}].issues가 배열이 아닙니다.`)
    if (!Array.isArray(l.disclaimers) || (l.disclaimers as unknown[]).length === 0)
      errors.push(`listings[${idx}].disclaimers(안내문구)가 없습니다.`)
  })
  const sensitive = findSensitiveKeys(d)
  if (sensitive.length > 0) errors.push(`민감정보 키가 포함되어 있습니다: ${sensitive.join(', ')}`)
  return errors
}
