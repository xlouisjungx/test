import { describe, expect, it } from 'vitest'
import { DEMO_HOUSES } from '../data/houses'
import type { UserConditions } from '../types'
import { rankHouses, scoreHouse } from './scoring'

const baseConditions = (over: Partial<UserConditions> = {}): UserConditions => ({
  regions: [],
  crop: '아직 미정',
  farmLocation: '',
  maxTravelMinutes: 999,
  budget: { maxDeposit: 5000, maxMonthlyRent: 100, repairBudget: 5000, maxInitialCost: 10000 },
  vehicles: ['승용차'],
  vehicleAccessRequired: false,
  parkingRequired: false,
  storageRequired: false,
  yardRequired: false,
  farmStorageRequired: false,
  requiredUtilities: [],
  priorities: [],
  ...over,
})

const byId = (id: string) => DEMO_HOUSES.find((h) => h.id === id)!

describe('적합도 순위', () => {
  it('사용자 조건에 따라 1순위가 실제로 달라진다', () => {
    // 생활 인프라 중시 + 트럭 없음 + 수리 부담 회피 → 성산 바람담은 집 우위
    const cityLike = rankHouses(
      DEMO_HOUSES,
      baseConditions({
        regions: ['성산읍'],
        requiredUtilities: ['transit', 'amenities', 'internet'],
        budget: { maxDeposit: 4000, maxMonthlyRent: 60, repairBudget: 800, maxInitialCost: 4000 },
      }),
    )
    expect(cityLike[0].house.id).toBe('seongsan-wind')

    // 밭작물 + 1톤 트럭 + 대형 창고 필수 + 수리 예산 충분 → 한림 창고형 우위
    const farmerLike = rankHouses(
      DEMO_HOUSES,
      baseConditions({
        regions: ['한림읍'],
        vehicles: ['1톤 트럭'],
        storageRequired: true,
        farmStorageRequired: true,
        maxTravelMinutes: 10,
        budget: { maxDeposit: 2000, maxMonthlyRent: 35, repairBudget: 4000, maxInitialCost: 6000 },
      }),
    )
    expect(farmerLike[0].house.id).toBe('hallim-warehouse')

    expect(cityLike[0].house.id).not.toBe(farmerLike[0].house.id)
  })

  it('순위는 1부터 순서대로 부여된다', () => {
    const ranked = rankHouses(DEMO_HOUSES, baseConditions())
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('동점이면 초기 주거비가 낮은 집을 우선 추천한다', () => {
    const a = { ...byId('aewol-stonewall'), id: 'a-cheap', deposit: 1000 }
    const b = { ...byId('aewol-stonewall'), id: 'b-expensive', deposit: 2000 }
    // 예산이 충분해 두 집의 점수 구성은 동일 → 초기 주거비로 순서 결정
    const ranked = rankHouses([b, a], baseConditions())
    expect(ranked[0].score.total).toBe(ranked[1].score.total)
    expect(ranked[0].house.id).toBe('a-cheap')
  })
})

describe('1톤 트럭 진입 조건', () => {
  it('트럭 필요 사용자에게 진입 불가 매물은 감점과 경고를 받는다', () => {
    const seongsan = byId('seongsan-wind') // truckAccess: 'no'
    const withTruck = scoreHouse(seongsan, baseConditions({ vehicles: ['1톤 트럭'] }))
    const withoutTruck = scoreHouse(seongsan, baseConditions({ vehicles: ['승용차'] }))

    const vehicleWith = withTruck.breakdown.find((b) => b.key === 'vehicle')!
    const vehicleWithout = withoutTruck.breakdown.find((b) => b.key === 'vehicle')!
    expect(vehicleWith.score).toBeLessThan(vehicleWithout.score)
    expect(withTruck.total).toBeLessThan(withoutTruck.total)
    expect(withTruck.warnings.some((w) => w.includes('1톤 트럭'))).toBe(true)
    expect(withoutTruck.warnings.some((w) => w.includes('1톤 트럭'))).toBe(false)
  })

  it('트럭 진입이 가능한 매물은 경고 없이 가점을 받는다', () => {
    const hallim = byId('hallim-warehouse') // truckAccess: 'yes'
    const score = scoreHouse(hallim, baseConditions({ vehicles: ['1톤 트럭'] }))
    expect(score.warnings.some((w) => w.includes('1톤 트럭'))).toBe(false)
    expect(score.matched.some((m) => m.includes('1톤 트럭'))).toBe(true)
  })
})

describe('수리 예산', () => {
  it('예상 수리비가 수리 예산을 초과하면 감점되고 경고가 표시된다', () => {
    const hallim = byId('hallim-warehouse') // 수리비 1450~3050만 원
    const richBudget = scoreHouse(
      hallim,
      baseConditions({ budget: { maxDeposit: 5000, maxMonthlyRent: 100, repairBudget: 4000, maxInitialCost: 10000 } }),
    )
    const poorBudget = scoreHouse(
      hallim,
      baseConditions({ budget: { maxDeposit: 5000, maxMonthlyRent: 100, repairBudget: 1000, maxInitialCost: 10000 } }),
    )

    const budgetRich = richBudget.breakdown.find((b) => b.key === 'budget')!
    const budgetPoor = poorBudget.breakdown.find((b) => b.key === 'budget')!
    expect(budgetPoor.score).toBeLessThan(budgetRich.score)
    expect(poorBudget.warnings.some((w) => w.includes('수리 예산'))).toBe(true)
    expect(richBudget.warnings.some((w) => w.includes('수리 예산'))).toBe(false)
  })
})

describe('창고 필수 조건', () => {
  it('창고 필수인데 창고가 없으면 감점과 주의 표시가 붙는다', () => {
    const seongsan = byId('seongsan-wind') // 창고 없음
    const required = scoreHouse(seongsan, baseConditions({ storageRequired: true }))
    const optional = scoreHouse(seongsan, baseConditions({ storageRequired: false }))

    expect(required.total).toBeLessThan(optional.total)
    expect(required.mismatched.some((m) => m.includes('창고'))).toBe(true)
    expect(required.cautions.some((m) => m.includes('창고'))).toBe(true)
  })
})

describe('필수 생활기반 미확인 처리', () => {
  it('필수 기반시설이 미확인이면 감점 대신 현장 확인 필요로 처리된다', () => {
    const aewol = byId('aewol-stonewall') // heating: 'unknown'
    const required = scoreHouse(aewol, baseConditions({ requiredUtilities: ['heating'] }))
    const optional = scoreHouse(aewol, baseConditions({ requiredUtilities: [] }))

    const utilRequired = required.breakdown.find((b) => b.key === 'utility')!
    const utilOptional = optional.breakdown.find((b) => b.key === 'utility')!
    expect(utilRequired.score).toBeGreaterThanOrEqual(utilOptional.score)
    expect(required.siteCheckNeeded.some((s) => s.includes('난방'))).toBe(true)
  })
})

describe('점수 구성', () => {
  it('총점은 0~100 사이이고 항목별 세부내역·추천 이유를 함께 반환한다', () => {
    for (const house of DEMO_HOUSES) {
      const score = scoreHouse(house, baseConditions())
      expect(score.total).toBeGreaterThanOrEqual(0)
      expect(score.total).toBeLessThanOrEqual(100)
      expect(score.breakdown).toHaveLength(6)
      expect(score.breakdown.reduce((s, b) => s + b.max, 0)).toBe(100)
      expect(score.reasons.length).toBeGreaterThan(0)
    }
  })
})
