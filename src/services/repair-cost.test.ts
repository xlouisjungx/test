import { describe, expect, it } from 'vitest'
import type { RepairEstimateItem, ReviewedIssue } from '../types/supplier'
import { buildEstimateFromIssues, estimateTotals, itemCost } from './repair-cost'

const item = (over: Partial<RepairEstimateItem> = {}): RepairEstimateItem => ({
  id: 'i1',
  name: '도배·도장',
  unit: '식',
  qty: 2,
  minUnitCost: 100,
  maxUnitCost: 300,
  basis: '',
  needsSiteQuote: false,
  ...over,
})

const issue = (over: Partial<ReviewedIssue> = {}): ReviewedIssue => ({
  id: 'iss1',
  part: '벽',
  photoCategory: '천장·벽 모서리',
  location: '',
  feature: '곰팡이 의심 변색',
  suspectedRepair: '도배·도장',
  likelihood: '보통',
  burden: '보통',
  photoSufficiency: '충분',
  confidence: '높음',
  needsSiteCheck: true,
  note: '',
  excluded: false,
  editReason: '',
  ...over,
})

describe('수리비 계산', () => {
  it('예상비용 = 수량 × 단가 (최소·최대)', () => {
    expect(itemCost(item())).toEqual({ min: 200, max: 600 })
  })

  it('총수리비는 항목별 최소·최대를 각각 합산한다', () => {
    const totals = estimateTotals([item(), item({ id: 'i2', qty: 1, minUnitCost: 50, maxUnitCost: 150 })])
    expect(totals.min).toBe(250)
    expect(totals.max).toBe(750)
  })

  it('현장견적 필요 항목은 합산에서 제외되고 별도 표시된다', () => {
    const totals = estimateTotals([item(), item({ id: 'i2', name: '지붕 보수', needsSiteQuote: true })])
    expect(totals.min).toBe(200)
    expect(totals.max).toBe(600)
    expect(totals.siteQuoteItems).toEqual(['지붕 보수'])
  })
})

describe('분석 이슈 → 수리항목 매핑', () => {
  it('검토에서 제외된 이슈는 수리항목을 만들지 않는다', () => {
    const est = buildEstimateFromIssues([issue({ excluded: true })])
    expect(est.items).toEqual([])
  })

  it('판단 불가 이슈는 비용을 계산하지 않고 현장견적 항목만 만든다', () => {
    const est = buildEstimateFromIssues([
      issue({ id: 'iss2', part: '지붕 외관', suspectedRepair: '지붕 보수', burden: '판단 불가', photoSufficiency: '판단 불가' }),
    ])
    expect(est.items).toHaveLength(1)
    expect(est.items[0].needsSiteQuote).toBe(true)
    expect(itemCost(est.items[0])).toEqual({ min: 0, max: 0 })
  })

  it('같은 수리항목은 중복 생성되지 않는다', () => {
    const est = buildEstimateFromIssues([issue(), issue({ id: 'iss2', part: '천장', feature: '벽지 변색' })])
    expect(est.items.filter((i) => i.name === '도배·도장')).toHaveLength(1)
  })

  it('새로 만든 수리비는 검토 전 상태다', () => {
    expect(buildEstimateFromIssues([issue()]).reviewed).toBe(false)
  })
})
