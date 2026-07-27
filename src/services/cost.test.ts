import { describe, expect, it } from 'vitest'
import { DEMO_HOUSES } from '../data/houses'
import { calcInitialCost, calcRepairRange } from './cost'

describe('수리비 범위 계산', () => {
  it('수리항목의 최소·최대 비용을 합산한다', () => {
    const range = calcRepairRange([
      { name: '도배', minCost: 100, maxCost: 200, basis: '' },
      { name: '창호', minCost: 300, maxCost: 500, basis: '' },
    ])
    expect(range).toEqual({ min: 400, max: 700 })
  })

  it('수리항목이 없으면 0원이다', () => {
    expect(calcRepairRange([])).toEqual({ min: 0, max: 0 })
  })
})

describe('초기 주거비 계산', () => {
  it('초기 주거비 = 보증금 + 예상 수리비 범위', () => {
    const aewol = DEMO_HOUSES.find((h) => h.id === 'aewol-stonewall')!
    // 보증금 2000 + 수리비 최소 600 / 최대 1400
    expect(calcInitialCost(aewol)).toEqual({ min: 2600, max: 3400 })
  })

  it('월 임대료는 초기 주거비에 포함되지 않는다', () => {
    const aewol = DEMO_HOUSES.find((h) => h.id === 'aewol-stonewall')!
    const withHigherRent = { ...aewol, monthlyRent: aewol.monthlyRent + 100 }
    expect(calcInitialCost(withHigherRent)).toEqual(calcInitialCost(aewol))
  })
})
