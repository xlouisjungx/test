import type { HouseListing, PhotoAnalysisResult, PhotoCategory, VisibleIssue } from '../../types'
import { uid, nowIso } from '../../repositories/storage'

export interface PhotoAnalysisProvider {
  readonly name: 'mock' | 'api'
  analyze(listing: HouseListing): Promise<PhotoAnalysisResult>
}

const BURDENS = ['low', 'medium', 'high'] as const
const SUFFICIENCIES = ['sufficient', 'partial', 'insufficient'] as const
const LIKELIHOODS = ['likely', 'possible', 'unknown'] as const
const CONFIDENCES = ['high', 'medium', 'low'] as const
const REPAIR_KEYS = [
  'wallpaper_paint', 'flooring', 'window', 'bathroom', 'kitchen', 'waterproof',
  'exterior_wall', 'demolition', 'structure', 'asbestos', 'plumbing', 'electric',
] as const

/** AI 응답 스키마 검증 — 형식이 다르면 오류 목록을 반환한다 */
export function validateAnalysisResult(data: unknown): string[] {
  const errors: string[] = []
  if (data == null || typeof data !== 'object') return ['분석 응답이 객체가 아닙니다.']
  const r = data as Record<string, unknown>
  if (typeof r.id !== 'string') errors.push('id가 없습니다.')
  if (r.provider !== 'mock' && r.provider !== 'api') errors.push('provider 값이 올바르지 않습니다.')
  if (typeof r.isDemo !== 'boolean') errors.push('isDemo가 boolean이 아닙니다.')
  if (typeof r.analyzedAt !== 'string') errors.push('analyzedAt이 없습니다.')
  if (!Array.isArray(r.uncheckable)) errors.push('uncheckable이 배열이 아닙니다.')
  if (!Array.isArray(r.issues)) {
    errors.push('issues가 배열이 아닙니다.')
    return errors
  }
  r.issues.forEach((raw, idx) => {
    if (raw == null || typeof raw !== 'object') {
      errors.push(`issues[${idx}]가 객체가 아닙니다.`)
      return
    }
    const i = raw as Record<string, unknown>
    const at = `issues[${idx}]`
    if (typeof i.id !== 'string') errors.push(`${at}.id가 없습니다.`)
    if (!Array.isArray(i.photoIds)) errors.push(`${at}.photoIds가 배열이 아닙니다.`)
    if (typeof i.area !== 'string' || i.area.length === 0) errors.push(`${at}.area가 없습니다.`)
    if (typeof i.observation !== 'string' || i.observation.length === 0) errors.push(`${at}.observation이 없습니다.`)
    if (!Array.isArray(i.suspectedRepairs) || i.suspectedRepairs.some((k) => !(REPAIR_KEYS as readonly string[]).includes(k as string)))
      errors.push(`${at}.suspectedRepairs에 알 수 없는 수리항목이 있습니다.`)
    if (!(BURDENS as readonly string[]).includes(i.burden as string)) errors.push(`${at}.burden 값이 올바르지 않습니다.`)
    if (!(SUFFICIENCIES as readonly string[]).includes(i.sufficiency as string)) errors.push(`${at}.sufficiency 값이 올바르지 않습니다.`)
    if (!(LIKELIHOODS as readonly string[]).includes(i.repairLikelihood as string)) errors.push(`${at}.repairLikelihood 값이 올바르지 않습니다.`)
    if (!(CONFIDENCES as readonly string[]).includes(i.confidence as string)) errors.push(`${at}.confidence 값이 올바르지 않습니다.`)
    if (typeof i.needsFieldCheck !== 'boolean') errors.push(`${at}.needsFieldCheck가 boolean이 아닙니다.`)
  })
  return errors
}

/**
 * 데모용 분석 템플릿 — 등록된 사진 분류를 기반으로 '예시' 관찰 결과를 만든다.
 * 실제 사진 내용을 분석하지 않으며, 존재하지 않는 하자를 사실처럼 단정하지 않는
 * 관찰형 문구만 사용한다. 결과는 항상 isDemo=true로 표시된다.
 */
const MOCK_TEMPLATES: Partial<Record<PhotoCategory, Omit<VisibleIssue, 'id' | 'photoIds'>>> = {
  ceiling_corner: {
    area: '천장', location: '천장·벽 모서리',
    observation: '천장 모서리 변색이 관찰되어 누수 여부를 현장에서 확인해야 합니다.',
    suspectedRepairs: ['waterproof', 'wallpaper_paint'],
    repairLikelihood: 'possible', burden: 'medium', sufficiency: 'partial', confidence: 'medium',
    needsFieldCheck: true,
    note: '변색 원인(누수·결로)은 사진만으로 구분할 수 없습니다.',
  },
  window: {
    area: '창호', location: '창문과 창틀',
    observation: '사진에서 보이는 범위에서는 창호 마감 손상이 의심됩니다.',
    suspectedRepairs: ['window'],
    repairLikelihood: 'possible', burden: 'medium', sufficiency: 'partial', confidence: 'medium',
    needsFieldCheck: true,
  },
  bathroom: {
    area: '화장실', location: '화장실 내부',
    observation: '타일 줄눈 오염과 마감 노후가 관찰됩니다.',
    suspectedRepairs: ['bathroom'],
    repairLikelihood: 'likely', burden: 'high', sufficiency: 'sufficient', confidence: 'medium',
    needsFieldCheck: true,
    note: '배관 내부 상태는 사진만으로 판단할 수 없습니다.',
  },
  kitchen: {
    area: '주방', location: '주방 싱크대 주변',
    observation: '싱크대 하부 마감 들뜸이 관찰됩니다.',
    suspectedRepairs: ['kitchen'],
    repairLikelihood: 'possible', burden: 'medium', sufficiency: 'partial', confidence: 'low',
    needsFieldCheck: false,
  },
  roof_wall: {
    area: '외벽', location: '외벽·지붕 외관',
    observation: '외벽 표면 균열로 보이는 선형 흔적이 관찰되어 현장 확인이 필요합니다.',
    suspectedRepairs: ['exterior_wall'],
    repairLikelihood: 'possible', burden: 'medium', sufficiency: 'partial', confidence: 'medium',
    needsFieldCheck: true,
    note: '구조적 영향 여부는 사진으로 판정할 수 없습니다.',
  },
  floor: {
    area: '바닥', location: '실내 바닥',
    observation: '바닥재 들뜸·마모가 관찰됩니다.',
    suspectedRepairs: ['flooring'],
    repairLikelihood: 'likely', burden: 'medium', sufficiency: 'sufficient', confidence: 'medium',
    needsFieldCheck: false,
  },
  living: {
    area: '벽', location: '거실 벽면',
    observation: '벽지 오염과 곰팡이로 의심되는 변색이 관찰됩니다.',
    suspectedRepairs: ['wallpaper_paint'],
    repairLikelihood: 'likely', burden: 'low', sufficiency: 'sufficient', confidence: 'high',
    needsFieldCheck: false,
  },
  utility: {
    area: '설비', location: '보일러·배관 주변',
    observation: '배관 연결부 주변에 녹·부식 흔적이 관찰됩니다.',
    suspectedRepairs: [],
    repairLikelihood: 'unknown', burden: 'medium', sufficiency: 'insufficient', confidence: 'low',
    needsFieldCheck: true,
    note: '사진만으로 내부 배관 상태를 판단할 수 없습니다.',
  },
}

const DEFAULT_UNCHECKABLE = [
  '내부 배관 상태',
  '전기배선 내부 상태',
  '지붕 내부 구조와 숨은 누수',
  '단열 상태',
  '보일러 실제 작동 여부',
]

/** 외부 AI 없이 데모 결과를 반환하는 Mock Provider */
export class MockPhotoAnalysisProvider implements PhotoAnalysisProvider {
  readonly name = 'mock' as const

  async analyze(listing: HouseListing): Promise<PhotoAnalysisResult> {
    if (listing.photos.length === 0) {
      throw new Error('분석할 사진이 없습니다. 사진을 먼저 등록하세요.')
    }
    // 데모 체감을 위한 지연
    await new Promise((r) => setTimeout(r, 1200))
    const issues: VisibleIssue[] = []
    for (const [category, template] of Object.entries(MOCK_TEMPLATES)) {
      const photos = listing.photos.filter((p) => p.category === category)
      if (photos.length === 0) continue
      issues.push({ ...template, id: uid(), photoIds: photos.map((p) => p.id) })
    }
    return {
      id: uid(),
      provider: 'mock',
      isDemo: true,
      analyzedAt: nowIso(),
      issues,
      uncheckable: [...DEFAULT_UNCHECKABLE],
    }
  }
}

/**
 * 실제 AI API 연결용 Provider.
 * API 키를 브라우저에 두지 않기 위해 반드시 서버 프록시 경유로 호출해야 하며,
 * MVP에서는 엔드포인트가 구성되지 않은 상태이므로 명확한 오류를 반환한다.
 */
export class ApiPhotoAnalysisProvider implements PhotoAnalysisProvider {
  readonly name = 'api' as const

  constructor(private endpoint?: string) {}

  async analyze(listing: HouseListing): Promise<PhotoAnalysisResult> {
    if (!this.endpoint) {
      throw new Error('AI 분석 서버가 구성되지 않았습니다. 데모 분석(Mock)을 사용하거나 서버 엔드포인트를 설정하세요.')
    }
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId: listing.id, photos: listing.photos.map((p) => ({ id: p.id, category: p.category })) }),
    })
    if (!res.ok) throw new Error(`분석 서버 오류 (HTTP ${res.status})`)
    const data: unknown = await res.json()
    const errors = validateAnalysisResult(data)
    if (errors.length > 0) throw new Error(`AI 응답이 스키마와 다릅니다: ${errors.join(' / ')}`)
    return data as PhotoAnalysisResult
  }
}

export function getAnalysisProvider(): PhotoAnalysisProvider {
  // 외부 AI API가 연결되어 있지 않으므로 Mock Provider를 사용한다.
  return new MockPhotoAnalysisProvider()
}
