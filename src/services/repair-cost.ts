import type { RepairEstimate, RepairEstimateItem, ReviewedIssue } from '../types/supplier'

/**
 * 예상 수리비 계산.
 * AI가 공사비를 직접 생성하지 않고, 분류된 수리항목을 사전 단가표와 연결해
 * 참고 비용 범위를 계산한다. (단위: 만 원)
 */

export interface UnitPrice {
  name: string
  unit: string
  minUnitCost: number
  maxUnitCost: number
  defaultQty: number
  basis: string
  needsSiteQuote: boolean
  /** 분석 결과의 의심 수리항목 키워드 매칭 */
  keywords: string[]
}

export const UNIT_PRICE_TABLE: UnitPrice[] = [
  { name: '도배·도장', unit: '식', minUnitCost: 150, maxUnitCost: 350, defaultQty: 1, basis: '전체 도배·부분 도장 기준', needsSiteQuote: false, keywords: ['도배', '도장', '벽지', '곰팡이', '변색'] },
  { name: '바닥재 교체', unit: '식', minUnitCost: 150, maxUnitCost: 450, defaultQty: 1, basis: '장판·마루 교체 기준', needsSiteQuote: false, keywords: ['바닥', '장판', '마루'] },
  { name: '창호 보수·교체', unit: '개소', minUnitCost: 80, maxUnitCost: 200, defaultQty: 3, basis: '개소당 보수·교체 기준', needsSiteQuote: false, keywords: ['창호', '새시', '창문', '창틀'] },
  { name: '화장실 보수', unit: '식', minUnitCost: 150, maxUnitCost: 600, defaultQty: 1, basis: '타일·위생기구 보수~전면 개보수', needsSiteQuote: false, keywords: ['화장실', '타일', '위생'] },
  { name: '주방 보수', unit: '식', minUnitCost: 100, maxUnitCost: 400, defaultQty: 1, basis: '싱크대 교체 기준', needsSiteQuote: false, keywords: ['주방', '싱크'] },
  { name: '방수', unit: '식', minUnitCost: 100, maxUnitCost: 400, defaultQty: 1, basis: '누수 의심 부위 부분 방수 기준', needsSiteQuote: false, keywords: ['방수', '누수', '천장'] },
  { name: '외벽 보수', unit: '식', minUnitCost: 100, maxUnitCost: 350, defaultQty: 1, basis: '균열 보수·부분 미장 기준', needsSiteQuote: false, keywords: ['외벽', '균열', '미장'] },
  { name: '부분 철거·폐기물 처리', unit: '식', minUnitCost: 50, maxUnitCost: 200, defaultQty: 1, basis: '내부 폐기물 반출 기준', needsSiteQuote: false, keywords: ['철거', '폐기물'] },
  { name: '지붕 보수', unit: '식', minUnitCost: 0, maxUnitCost: 0, defaultQty: 1, basis: '범위 판단 불가 — 현장견적 필요', needsSiteQuote: true, keywords: ['지붕', '슬레이트'] },
  { name: '보일러·난방 교체', unit: '대', minUnitCost: 200, maxUnitCost: 400, defaultQty: 1, basis: '기름보일러 교체 기준', needsSiteQuote: false, keywords: ['보일러', '난방'] },
  { name: '전체 배관·전기공사', unit: '식', minUnitCost: 0, maxUnitCost: 0, defaultQty: 1, basis: '사진만으로 범위 판단 불가 — 현장견적 필요', needsSiteQuote: true, keywords: ['배관', '배선', '전기공사', '녹', '부식'] },
]

export const REPAIR_COST_NOTICE =
  '예상 수리비는 사진에서 확인된 항목과 사전 단가표를 이용해 계산한 참고 범위입니다. 실제 공사범위와 견적은 전문가의 현장점검에 따라 달라질 수 있습니다.'

export function itemCost(item: RepairEstimateItem): { min: number; max: number } {
  if (item.needsSiteQuote) return { min: 0, max: 0 }
  return { min: item.qty * item.minUnitCost, max: item.qty * item.maxUnitCost }
}

/** 총수리비 — 현장견적 필요 항목은 합산에서 제외 */
export function estimateTotals(items: RepairEstimateItem[]): {
  min: number
  max: number
  siteQuoteItems: string[]
} {
  let min = 0
  let max = 0
  const siteQuoteItems: string[] = []
  for (const item of items) {
    if (item.needsSiteQuote) {
      siteQuoteItems.push(item.name)
      continue
    }
    const c = itemCost(item)
    min += c.min
    max += c.max
  }
  return { min, max, siteQuoteItems }
}

let seq = 0
const nextId = () => `rep-${Date.now().toString(36)}-${++seq}`

/** 검토 완료된 분석 이슈에서 수리항목 추정 (제외된 이슈·판단 불가 이슈는 비용 계산에서 제외) */
export function buildEstimateFromIssues(issues: ReviewedIssue[]): RepairEstimate {
  const picked = new Map<string, UnitPrice>()
  for (const issue of issues) {
    if (issue.excluded) continue
    if (issue.burden === '판단 불가' || issue.photoSufficiency === '판단 불가') {
      // 판단 불가 항목은 비용을 만들지 않고 현장견적 대상만 표시
      const match = UNIT_PRICE_TABLE.find(
        (u) => u.needsSiteQuote && u.keywords.some((k) => (issue.part + issue.suspectedRepair).includes(k)),
      )
      if (match) picked.set(match.name, match)
      continue
    }
    const text = issue.part + ' ' + issue.suspectedRepair + ' ' + issue.feature
    const match = UNIT_PRICE_TABLE.find((u) => u.keywords.some((k) => text.includes(k)))
    if (match) picked.set(match.name, match)
  }
  const items: RepairEstimateItem[] = [...picked.values()].map((u) => ({
    id: nextId(),
    name: u.name,
    unit: u.unit,
    qty: u.defaultQty,
    minUnitCost: u.minUnitCost,
    maxUnitCost: u.maxUnitCost,
    basis: u.basis,
    needsSiteQuote: u.needsSiteQuote,
  }))
  return { items, reviewed: false, reviewedAt: '' }
}
