import type { House, InitialCostRange, RepairItem } from '../types'

/** 수리항목 합산 → 예상 수리비 범위 (만 원) */
export function calcRepairRange(items: RepairItem[]): { min: number; max: number } {
  return items.reduce(
    (acc, item) => ({ min: acc.min + item.minCost, max: acc.max + item.maxCost }),
    { min: 0, max: 0 },
  )
}

/**
 * 초기 주거비 범위 (만 원)
 * - 최소 = 보증금 + 최소 예상 수리비
 * - 최대 = 보증금 + 최대 예상 수리비
 * 월 임대료는 포함하지 않고 별도로 표시한다.
 */
export function calcInitialCost(house: House): InitialCostRange {
  const repair = calcRepairRange(house.repairItems)
  return {
    min: house.deposit + repair.min,
    max: house.deposit + repair.max,
  }
}

/** 초기 주거비에 포함되지 않는 비용 안내 문구 */
export const INITIAL_COST_EXCLUSIONS = [
  '중개수수료',
  '이사비',
  '가구·가전 구입비',
  '실제 공사 과정에서 발생하는 추가비용',
  '농지 임차 및 영농시설 비용',
]
