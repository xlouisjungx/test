import type { HouseListing, PhotoAnalysisResult, VisibleIssue } from '../../types/supplier'

/**
 * AI 사진 분석 provider 패턴.
 * 외부 AI가 연결되지 않은 환경에서는 MockPhotoAnalysisProvider가 데모 결과를 반환한다.
 * 실제 API 연결 시에는 서버를 경유해 호출하고 API 키를 브라우저에 노출하지 않는다.
 */

export interface PhotoAnalysisProvider {
  readonly kind: 'mock' | 'api'
  analyze(listing: HouseListing): Promise<PhotoAnalysisResult>
}

const LIKELIHOODS = ['낮음', '보통', '높음', '판단 불가']
const SUFFICIENCY = ['충분', '부분 확인', '판단 불가']
const CONFIDENCE = ['높음', '보통', '낮음']

/** AI 응답 스키마 검증 — 형식이 다르면 오류로 처리한다 */
export function validateAnalysisResult(value: unknown): value is PhotoAnalysisResult {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.listingId !== 'string' || typeof v.analyzedAt !== 'string') return false
  if (v.provider !== 'mock' && v.provider !== 'api') return false
  if (typeof v.isDemo !== 'boolean') return false
  if (!Array.isArray(v.unknowns) || !v.unknowns.every((u) => typeof u === 'string')) return false
  if (!Array.isArray(v.issues)) return false
  return v.issues.every((raw) => {
    if (typeof raw !== 'object' || raw === null) return false
    const i = raw as Record<string, unknown>
    return (
      typeof i.id === 'string' &&
      typeof i.part === 'string' &&
      typeof i.feature === 'string' &&
      typeof i.suspectedRepair === 'string' &&
      LIKELIHOODS.includes(i.likelihood as string) &&
      LIKELIHOODS.includes(i.burden as string) &&
      SUFFICIENCY.includes(i.photoSufficiency as string) &&
      CONFIDENCE.includes(i.confidence as string) &&
      typeof i.needsSiteCheck === 'boolean' &&
      typeof i.note === 'string'
    )
  })
}

let seq = 0
const issueId = () => `iss-${Date.now().toString(36)}-${++seq}`

/** 데모 매물 3채에 대해 사전 작성된 분석 결과 */
const CURATED: Record<string, { issues: Omit<VisibleIssue, 'id'>[]; unknowns: string[] }> = {
  'aewol-stonewall': {
    issues: [
      { part: '벽', photoCategory: '천장·벽 모서리', location: '안방 모서리', feature: '곰팡이 또는 누수 흔적으로 의심되는 변색', suspectedRepair: '도배·도장', likelihood: '보통', burden: '보통', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '결로·누수 원인 확인 후 도배 범위를 정해야 합니다.' },
      { part: '천장', photoCategory: '천장·벽 모서리', location: '거실 천장', feature: '과거 누수 흔적으로 의심되는 얼룩', suspectedRepair: '방수', likelihood: '보통', burden: '보통', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '지붕·방수층과 연결된 문제인지 현장 확인이 필요합니다.' },
      { part: '창호', photoCategory: '창문·창틀', location: '거실·안방 창', feature: '노후 알루미늄 새시, 마감 손상 의심', suspectedRepair: '창호 보수·교체', likelihood: '높음', burden: '보통', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '사진에서 보이는 범위에서는 창호 마감 손상이 의심됩니다.' },
      { part: '화장실', photoCategory: '화장실', location: '욕실 벽면', feature: '타일·위생기구 노후 흔적', suspectedRepair: '화장실 보수', likelihood: '보통', burden: '보통', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '부분 보수 가능 여부를 현장에서 확인해 보세요.' },
      { part: '지붕 외관', photoCategory: '지붕·외벽', location: '지붕 전체', feature: '근접 사진 없음', suspectedRepair: '지붕 보수', likelihood: '판단 불가', burden: '판단 불가', photoSufficiency: '판단 불가', confidence: '낮음', needsSiteCheck: true, note: '사진만으로 지붕 상태를 판단할 수 없습니다.' },
    ],
    unknowns: ['내부 배관 상태', '보일러 작동 여부', '지붕 내부 구조', '전기 배선 상태'],
  },
  'hallim-warehouse': {
    issues: [
      { part: '벽', photoCategory: '방 내부', location: '방 전체', feature: '벽지 들뜸·오염', suspectedRepair: '도배·도장', likelihood: '높음', burden: '보통', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '벽체 균열 여부는 현장에서 확인해야 합니다.' },
      { part: '천장', photoCategory: '천장·벽 모서리', location: '주방 천장', feature: '처짐과 얼룩 — 누수 이력 의심', suspectedRepair: '방수', likelihood: '높음', burden: '높음', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '천장 변색이 확인되어 누수 여부를 현장에서 확인해야 합니다.' },
      { part: '바닥', photoCategory: '바닥', location: '거실·방', feature: '장판 노후, 일부 꺼짐 의심', suspectedRepair: '바닥재 교체', likelihood: '높음', burden: '보통', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '바닥 수평·하부 상태는 사진만으로 판단할 수 없습니다.' },
      { part: '창호', photoCategory: '창문·창틀', location: '전체 창', feature: '단창 혼합 새시 노후', suspectedRepair: '창호 보수·교체', likelihood: '높음', burden: '높음', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: false, note: '단열을 위해 이중창 교체를 고려할 수 있습니다.' },
      { part: '화장실', photoCategory: '화장실', location: '욕실 전체', feature: '재래식에 가까운 구조', suspectedRepair: '화장실 보수', likelihood: '높음', burden: '높음', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '배관 위치 변경 여부에 따라 비용 차이가 큽니다.' },
      { part: '지붕 외관', photoCategory: '지붕·외벽', location: '지붕 전체', feature: '슬레이트 지붕으로 보임', suspectedRepair: '지붕 보수', likelihood: '판단 불가', burden: '판단 불가', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '석면 포함 여부는 사진으로 판단할 수 없어 전문가 조사가 필요합니다.' },
      { part: '설비', photoCategory: '전기·수도·난방설비', location: '보일러실', feature: '보일러 노후·부식 의심', suspectedRepair: '보일러·난방 교체', likelihood: '높음', burden: '보통', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '작동 여부는 현장에서 확인해야 합니다.' },
    ],
    unknowns: ['지붕 석면 포함 여부', '전기 승압 필요 여부', '수도·배수 배관 상태', '바닥 하부 상태'],
  },
  'seongsan-wind': {
    issues: [
      { part: '벽', photoCategory: '거실 전체', location: '거실', feature: '대체로 깨끗한 벽지', suspectedRepair: '도배·도장', likelihood: '낮음', burden: '낮음', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: false, note: '취향에 따라 부분 도배 정도를 고려할 수 있습니다.' },
      { part: '창호', photoCategory: '창문·창틀', location: '거실 창', feature: '이중창 설치, 일부 개폐 상태 미확인', suspectedRepair: '창호 보수·교체', likelihood: '낮음', burden: '낮음', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '현장에서 개폐·잠금 상태를 확인해 보세요.' },
      { part: '지붕 외관', photoCategory: '지붕·외벽', location: '지붕', feature: '원거리 사진 1장뿐', suspectedRepair: '지붕 보수', likelihood: '판단 불가', burden: '판단 불가', photoSufficiency: '판단 불가', confidence: '낮음', needsSiteCheck: true, note: '강풍 지역 특성상 지붕 고정 상태를 현장에서 확인하는 것이 좋습니다.' },
    ],
    unknowns: ['지붕 세부 상태', '내부 배관 상태', '단열 성능'],
  },
}

/** 일반 등록 매물용 데모 분석 — 존재하지 않는 하자를 만들어내지 않도록 보수적으로 생성 */
function genericDemoIssues(listing: HouseListing): { issues: Omit<VisibleIssue, 'id'>[]; unknowns: string[] } {
  const categories = new Set(listing.photos.map((p) => p.category))
  const issues: Omit<VisibleIssue, 'id'>[] = []
  const push = (partial: Omit<VisibleIssue, 'id'>) => issues.push(partial)

  for (const [category, part] of [
    ['천장·벽 모서리', '벽·천장'],
    ['바닥', '바닥'],
    ['창문·창틀', '창호'],
    ['주방', '주방'],
    ['화장실', '화장실'],
    ['지붕·외벽', '지붕 외관'],
  ] as const) {
    if (categories.has(category)) {
      push({
        part,
        photoCategory: category,
        location: '등록 사진 기준',
        feature: '데모 분석 — 사진에서 특이 소견을 자동 판정하지 않습니다',
        suspectedRepair: '',
        likelihood: '판단 불가',
        burden: '판단 불가',
        photoSufficiency: '부분 확인',
        confidence: '낮음',
        needsSiteCheck: true,
        note: '실제 AI 미연결 상태의 분석 결과 예시입니다. 현장 확인이 필요합니다.',
      })
    }
  }
  return {
    issues,
    unknowns: ['내부 배관 상태', '전기 배선 상태', '지붕 내부 상태', '보일러 작동 여부'],
  }
}

export class MockPhotoAnalysisProvider implements PhotoAnalysisProvider {
  readonly kind = 'mock' as const

  async analyze(listing: HouseListing): Promise<PhotoAnalysisResult> {
    await new Promise((r) => setTimeout(r, 1200))
    const curated = CURATED[listing.id]
    const source = curated ?? genericDemoIssues(listing)
    const result: PhotoAnalysisResult = {
      listingId: listing.id,
      provider: 'mock',
      isDemo: true,
      analyzedAt: new Date().toISOString(),
      issues: source.issues.map((i) => ({ ...i, id: issueId() })),
      unknowns: [...source.unknowns],
    }
    if (!validateAnalysisResult(result)) {
      throw new Error('분석 응답이 스키마와 일치하지 않습니다.')
    }
    return result
  }
}

export function getPhotoAnalysisProvider(): PhotoAnalysisProvider {
  // 외부 AI API 미연결 — Mock Provider 사용 (연결 시 서버 경유 ApiPhotoAnalysisProvider로 교체)
  return new MockPhotoAnalysisProvider()
}
