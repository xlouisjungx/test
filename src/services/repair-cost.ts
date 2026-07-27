import type {
  HouseListing,
  RepairEstimate,
  RepairEstimateItem,
  RepairItemKey,
  VisibleIssue,
} from '../types'
import { REPAIR_ITEM_LABEL } from '../data/constants'

interface RepairRate {
  unit: string
  minRateManwon: number
  maxRateManwon: number
  /** 사진만으로 범위를 판단할 수 없어 비용을 계산하지 않는 항목 */
  fieldQuoteOnly?: boolean
  defaultQty: (l: Pick<HouseListing, 'basic'>) => number
  basis: string
}

/** 사전 정의 수리 단가표 (만 원) — AI가 공사비를 생성하지 않고 이 표와 수량으로 계산한다 */
export const REPAIR_RATES: Record<RepairItemKey, RepairRate> = {
  wallpaper_paint: {
    unit: '㎡', minRateManwon: 1.5, maxRateManwon: 3,
    defaultQty: (l) => Math.max(10, Math.round((l.basic.floorAreaM2 ?? 60) * 2.2)),
    basis: '벽·천장 시공면적을 연면적의 약 2.2배로 추정',
  },
  flooring: {
    unit: '㎡', minRateManwon: 3, maxRateManwon: 6,
    defaultQty: (l) => Math.max(10, Math.round(l.basic.floorAreaM2 ?? 60)),
    basis: '연면적 기준 바닥 시공면적 추정',
  },
  window: {
    unit: '개소', minRateManwon: 30, maxRateManwon: 90,
    defaultQty: (l) => Math.max(1, l.basic.rooms ?? 2),
    basis: '방 수 기준 창호 개소 추정',
  },
  bathroom: {
    unit: '개소', minRateManwon: 150, maxRateManwon: 400,
    defaultQty: (l) => Math.max(1, l.basic.baths ?? 1),
    basis: '화장실 수 기준',
  },
  kitchen: {
    unit: '식', minRateManwon: 200, maxRateManwon: 500,
    defaultQty: () => 1,
    basis: '주방 1개소 기준',
  },
  waterproof: {
    unit: '개소', minRateManwon: 50, maxRateManwon: 150,
    defaultQty: () => 1,
    basis: '누수 의심 부위 1개소 기준(범위 확대 시 현장 확인 필요)',
  },
  exterior_wall: {
    unit: '㎡', minRateManwon: 2, maxRateManwon: 5,
    defaultQty: (l) => Math.max(10, Math.round((l.basic.floorAreaM2 ?? 60) * 0.8)),
    basis: '외벽 보수면적을 연면적의 약 0.8배로 추정',
  },
  demolition: {
    unit: '식', minRateManwon: 50, maxRateManwon: 150,
    defaultQty: () => 1,
    basis: '부분 철거·폐기물 처리 1식 기준',
  },
  structure: {
    unit: '식', minRateManwon: 0, maxRateManwon: 0, fieldQuoteOnly: true,
    defaultQty: () => 1,
    basis: '사진만으로 범위 판단 불가 — 현장견적 필요',
  },
  asbestos: {
    unit: '식', minRateManwon: 0, maxRateManwon: 0, fieldQuoteOnly: true,
    defaultQty: () => 1,
    basis: '사진만으로 범위 판단 불가 — 현장견적 필요',
  },
  plumbing: {
    unit: '식', minRateManwon: 0, maxRateManwon: 0, fieldQuoteOnly: true,
    defaultQty: () => 1,
    basis: '사진만으로 범위 판단 불가 — 현장견적 필요',
  },
  electric: {
    unit: '식', minRateManwon: 0, maxRateManwon: 0, fieldQuoteOnly: true,
    defaultQty: () => 1,
    basis: '사진만으로 범위 판단 불가 — 현장견적 필요',
  },
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export function makeEstimateItem(key: RepairItemKey, quantity: number, basis?: string): RepairEstimateItem {
  const rate = REPAIR_RATES[key]
  const qty = Math.max(0, quantity)
  const fieldOnly = rate.fieldQuoteOnly === true
  return {
    key,
    label: REPAIR_ITEM_LABEL[key],
    unit: rate.unit,
    quantity: qty,
    minRateManwon: rate.minRateManwon,
    maxRateManwon: rate.maxRateManwon,
    minCostManwon: fieldOnly ? 0 : round1(qty * rate.minRateManwon),
    maxCostManwon: fieldOnly ? 0 : round1(qty * rate.maxRateManwon),
    basis: basis ?? rate.basis,
    needsFieldQuote: fieldOnly,
  }
}

export function computeTotals(items: RepairEstimateItem[]): { totalMinManwon: number; totalMaxManwon: number } {
  const priced = items.filter((i) => !i.needsFieldQuote)
  return {
    totalMinManwon: round1(priced.reduce((s, i) => s + i.minCostManwon, 0)),
    totalMaxManwon: round1(priced.reduce((s, i) => s + i.maxCostManwon, 0)),
  }
}

/** 검토에서 제외되지 않은 이슈의 수리항목으로 예상 수리비 초안을 만든다 */
export function buildEstimate(listing: Pick<HouseListing, 'basic'>, issues: VisibleIssue[]): RepairEstimate {
  const keys = [...new Set(issues.filter((i) => !i.excluded).flatMap((i) => i.suspectedRepairs))]
  const items = keys.map((k) => makeEstimateItem(k, REPAIR_RATES[k].defaultQty(listing)))
  return { items, ...computeTotals(items), reviewed: false }
}

/** 수량 수정 후 항목·합계 재계산 */
export function recalcEstimate(estimate: RepairEstimate): RepairEstimate {
  const items = estimate.items.map((i) => makeEstimateItem(i.key, i.quantity, i.basis))
  return { ...estimate, items, ...computeTotals(items) }
}
