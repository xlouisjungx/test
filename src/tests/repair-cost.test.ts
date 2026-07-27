import { describe, expect, it } from 'vitest'
import { buildEstimate, computeTotals, makeEstimateItem, recalcEstimate } from '../services/repair-cost'
import type { VisibleIssue } from '../types'

const basic = { basic: { floorAreaM2: 60, rooms: 2, baths: 1 } } as Parameters<typeof buildEstimate>[0]

function issue(repairs: VisibleIssue['suspectedRepairs'], excluded = false): VisibleIssue {
  return {
    id: `i-${repairs.join('-')}`,
    photoIds: [],
    area: '벽',
    location: '테스트',
    observation: '테스트 관찰',
    suspectedRepairs: repairs,
    repairLikelihood: 'possible',
    burden: 'medium',
    sufficiency: 'partial',
    confidence: 'medium',
    needsFieldCheck: false,
    excluded,
  }
}

describe('수리비 계산', () => {
  it('최소·최대 비용 = 수량 × 단가', () => {
    const item = makeEstimateItem('flooring', 10) // 3~6만 원/㎡
    expect(item.minCostManwon).toBe(30)
    expect(item.maxCostManwon).toBe(60)
  })

  it('음수 수량은 0으로 보정된다', () => {
    const item = makeEstimateItem('flooring', -5)
    expect(item.quantity).toBe(0)
    expect(item.minCostManwon).toBe(0)
  })

  it('총수리비는 항목별 최소·최대를 각각 합산한다', () => {
    const items = [makeEstimateItem('flooring', 10), makeEstimateItem('window', 2)] // 30~60 + 60~180
    const totals = computeTotals(items)
    expect(totals.totalMinManwon).toBe(90)
    expect(totals.totalMaxManwon).toBe(240)
  })

  it('현장견적 필요 항목(구조·석면 등)은 비용을 계산하지 않고 합계에서 제외한다', () => {
    const items = [makeEstimateItem('flooring', 10), makeEstimateItem('structure', 1)]
    expect(items[1].needsFieldQuote).toBe(true)
    expect(items[1].minCostManwon).toBe(0)
    const totals = computeTotals(items)
    expect(totals.totalMinManwon).toBe(30)
    expect(totals.totalMaxManwon).toBe(60)
  })

  it('검토에서 제외된 이슈의 수리항목은 견적에 포함되지 않는다', () => {
    const est = buildEstimate(basic, [issue(['flooring']), issue(['kitchen'], true)])
    expect(est.items.map((i) => i.key)).toEqual(['flooring'])
  })

  it('수량 수정 후 재계산이 합계에 반영된다', () => {
    const est = buildEstimate(basic, [issue(['flooring'])])
    const edited = recalcEstimate({ ...est, items: est.items.map((i) => ({ ...i, quantity: 20 })) })
    expect(edited.items[0].minCostManwon).toBe(60)
    expect(edited.totalMinManwon).toBe(60)
    expect(edited.totalMaxManwon).toBe(120)
  })
})
