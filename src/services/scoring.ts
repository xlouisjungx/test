import type {
  House,
  HouseScore,
  RankedHouse,
  ScoreBreakdownItem,
  UserConditions,
} from '../types'
import { UTILITY_LABELS } from '../types'
import { calcInitialCost, calcRepairRange } from './cost'

/**
 * 적합도 산정 (총 100점, 설명 가능한 규칙 기반)
 * - 예산 및 초기 주거비 적합성: 25점
 * - 희망지역·농지 접근성: 20점
 * - 차량·농기계 진입 및 주차: 15점
 * - 창고·마당·보관공간: 15점
 * - 주택 상태와 수리 부담: 15점
 * - 수도·전기·난방·인터넷·생활시설: 10점
 */
export const SCORE_WEIGHTS = [
  { key: 'budget', label: '예산·초기 주거비', max: 25 },
  { key: 'access', label: '희망지역·농지 접근성', max: 20 },
  { key: 'vehicle', label: '차량·농기계 진입·주차', max: 15 },
  { key: 'storage', label: '창고·마당·보관공간', max: 15 },
  { key: 'condition', label: '주택 상태·수리 부담', max: 15 },
  { key: 'utility', label: '생활 기반시설', max: 10 },
] as const

interface ReasonCandidate {
  category: string
  text: string
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function scoreHouse(house: House, c: UserConditions): HouseScore {
  const breakdown: ScoreBreakdownItem[] = []
  const reasons: ReasonCandidate[] = []
  const cautions: string[] = []
  const matched: string[] = []
  const mismatched: string[] = []
  const siteCheckNeeded: string[] = []
  const warnings: string[] = []

  const repair = calcRepairRange(house.repairItems)
  const initialCost = calcInitialCost(house)

  // ── 1. 예산 및 초기 주거비 (25점) ─────────────────────────────
  let budgetScore = 0
  const budgetDetails: string[] = []

  // 초기 주거비 적합성 (13점)
  const maxInitial = c.budget.maxInitialCost
  if (maxInitial <= 0 || initialCost.max <= maxInitial) {
    budgetScore += 13
    matched.push('초기 주거비가 예산 범위 안에 있어요')
    reasons.push({
      category: '예산·초기 주거비',
      text: `초기 주거비(${initialCost.min.toLocaleString()}~${initialCost.max.toLocaleString()}만 원)가 예산 안에 들어와요`,
    })
    budgetDetails.push('초기 주거비 예산 내')
  } else if (initialCost.min <= maxInitial) {
    budgetScore += 8
    cautions.push('수리 범위에 따라 초기 주거비가 예산을 넘을 수 있어요')
    budgetDetails.push('초기 주거비가 예산 상단에 걸쳐 있음')
  } else {
    const overRatio = initialCost.min / maxInitial - 1
    budgetScore += Math.max(0, Math.round(13 * (1 - overRatio * 2)))
    mismatched.push(
      `최소 초기 주거비(${initialCost.min.toLocaleString()}만 원)가 최대 예산(${maxInitial.toLocaleString()}만 원)을 초과해요`,
    )
    budgetDetails.push('초기 주거비 예산 초과')
  }

  // 월 임대료 (6점)
  const maxRent = c.budget.maxMonthlyRent
  if (maxRent <= 0 || house.monthlyRent <= maxRent) {
    budgetScore += 6
    budgetDetails.push('월 임대료 허용 범위 내')
  } else {
    const over = (house.monthlyRent - maxRent) / maxRent
    budgetScore += Math.max(0, Math.round(6 * (1 - over * 2)))
    mismatched.push(`월 임대료(${house.monthlyRent}만 원)가 허용치(${maxRent}만 원)를 초과해요`)
    budgetDetails.push('월 임대료 초과')
  }

  // 수리 예산 (6점)
  const repairBudget = c.budget.repairBudget
  if (repairBudget <= 0 || repair.max <= repairBudget) {
    budgetScore += 6
    budgetDetails.push('예상 수리비 수리 예산 내')
  } else if (repair.min <= repairBudget) {
    budgetScore += 3
    warnings.push('수리 범위에 따라 예상 수리비가 수리 예산을 초과할 수 있어요')
    budgetDetails.push('수리비가 수리 예산 상단에 걸쳐 있음')
  } else {
    warnings.push(
      `예상 수리비(최소 ${repair.min.toLocaleString()}만 원)가 수리 예산(${repairBudget.toLocaleString()}만 원)을 초과해요`,
    )
    mismatched.push('예상 수리비가 수리 예산을 초과해요')
    budgetDetails.push('수리비 예산 초과')
  }

  if (c.budget.maxDeposit > 0 && house.deposit > c.budget.maxDeposit) {
    mismatched.push(`보증금(${house.deposit.toLocaleString()}만 원)이 최대 보증금을 초과해요`)
  }

  breakdown.push({
    key: 'budget',
    label: '예산·초기 주거비',
    score: round1(Math.min(25, budgetScore)),
    max: 25,
    detail: budgetDetails.join(' · '),
  })

  // ── 2. 희망지역·농지 접근성 (20점) ────────────────────────────
  let accessScore = 0
  const accessDetails: string[] = []

  if (c.regions.length === 0 || c.regions.includes(house.region)) {
    accessScore += 10
    if (c.regions.includes(house.region)) {
      matched.push(`희망지역(${house.region})과 일치해요`)
      reasons.push({ category: '농지 접근성', text: `희망지역인 ${house.region}에 있어요` })
    }
    accessDetails.push('희망지역 일치')
  } else {
    accessScore += 3
    mismatched.push(`희망지역이 아닌 ${house.region}에 있어요`)
    accessDetails.push('희망지역 불일치')
  }

  const t = house.farmTravelMinutes
  if (c.maxTravelMinutes === 999) {
    accessScore += t <= 10 ? 10 : t <= 20 ? 9 : t <= 30 ? 8 : 6
    accessDetails.push(`농지까지 ${t}분`)
    if (t <= 10) reasons.push({ category: '농지 접근성', text: `농지까지 ${t}분 거리라 매일 오가기 좋아요` })
  } else if (t <= c.maxTravelMinutes) {
    accessScore += 10
    matched.push(`농지 이동시간(${t}분)이 허용 범위(${c.maxTravelMinutes}분) 안이에요`)
    reasons.push({ category: '농지 접근성', text: `농지까지 ${t}분으로 허용 시간 안에 들어와요` })
    accessDetails.push('농지 이동시간 허용 범위 내')
  } else {
    accessScore += Math.max(0, 10 - Math.ceil((t - c.maxTravelMinutes) / 5) * 3)
    mismatched.push(`농지 이동시간(${t}분)이 허용치(${c.maxTravelMinutes}분)를 초과해요`)
    accessDetails.push('농지 이동시간 초과')
  }

  breakdown.push({
    key: 'access',
    label: '희망지역·농지 접근성',
    score: round1(Math.min(20, accessScore)),
    max: 20,
    detail: accessDetails.join(' · '),
  })

  // ── 3. 차량·농기계 진입 및 주차 (15점) ─────────────────────────
  let vehicleScore = 0
  const vehicleDetails: string[] = []
  const needsTruck = c.vehicles.includes('1톤 트럭')
  const needsMachine = c.vehicles.includes('소형 농기계')

  if (needsTruck) {
    if (house.truckAccess === 'yes') {
      vehicleScore += 9
      matched.push('1톤 트럭 진입이 가능해요')
      reasons.push({ category: '차량·농기계 진입', text: '1톤 트럭 진입이 가능해 작업 동선이 편해요' })
      vehicleDetails.push('1톤 트럭 진입 가능')
    } else if (house.truckAccess === 'unknown') {
      vehicleScore += 5
      siteCheckNeeded.push('1톤 트럭 진입 가능 여부')
      vehicleDetails.push('트럭 진입 여부 확인 필요')
    } else {
      warnings.push('1톤 트럭 진입이 어려운 매물이에요')
      mismatched.push('1톤 트럭 진입이 어려워요')
      vehicleDetails.push('트럭 진입 불가로 큰 감점')
    }
  } else if (c.vehicleAccessRequired) {
    if (house.truckAccess === 'yes' || house.parking === 'yes') {
      vehicleScore += 9
      matched.push('차량 진입이 가능해요')
      vehicleDetails.push('차량 진입 가능')
    } else if (house.truckAccess === 'unknown') {
      vehicleScore += 5
      siteCheckNeeded.push('차량 진입 가능 여부')
      vehicleDetails.push('차량 진입 여부 확인 필요')
    } else {
      vehicleScore += 2
      mismatched.push('차량 진입이 어려울 수 있어요')
      vehicleDetails.push('차량 진입 어려움')
    }
  } else {
    vehicleScore += 9
    vehicleDetails.push('차량 진입 조건 없음')
  }

  if (needsMachine) {
    if (house.machineAccess === 'no') {
      vehicleScore -= 3
      mismatched.push('소형 농기계 진입이 어려워요')
    } else if (house.machineAccess === 'unknown') {
      siteCheckNeeded.push('소형 농기계 진입 가능 여부')
    }
  }

  if (c.parkingRequired) {
    if (house.parking === 'yes') {
      vehicleScore += 6
      matched.push('주차 공간이 있어요')
      vehicleDetails.push('주차 가능')
    } else if (house.parking === 'unknown') {
      vehicleScore += 3
      siteCheckNeeded.push('주차 공간 여부')
      vehicleDetails.push('주차 여부 확인 필요')
    } else {
      mismatched.push('필수 조건인 주차 공간이 없어요')
      vehicleDetails.push('주차 불가')
    }
  } else {
    vehicleScore += house.parking === 'yes' ? 6 : house.parking === 'unknown' ? 4 : 3
  }

  breakdown.push({
    key: 'vehicle',
    label: '차량·농기계 진입·주차',
    score: round1(Math.max(0, Math.min(15, vehicleScore))),
    max: 15,
    detail: vehicleDetails.join(' · '),
  })

  // ── 4. 창고·마당·보관공간 (15점) ─────────────────────────────
  let storageScore = 0
  const storageDetails: string[] = []

  if (c.storageRequired) {
    if (house.hasStorage) {
      storageScore += 6
      matched.push(`창고가 있어요 (${house.storageNote})`)
      reasons.push({ category: '창고·보관공간', text: `창고가 있어요 — ${house.storageNote}` })
      storageDetails.push('창고 있음')
    } else {
      mismatched.push('필수 조건인 창고가 없어요')
      cautions.push('창고가 없어 별도 보관 공간 마련이 필요해요')
      storageDetails.push('창고 없음')
    }
  } else {
    storageScore += house.hasStorage ? 6 : 4
    storageDetails.push(house.hasStorage ? '창고 있음' : '창고 없음(필수 아님)')
  }

  if (c.yardRequired) {
    if (house.hasYard) {
      storageScore += 5
      matched.push(`마당이 있어요 (${house.yardNote})`)
      storageDetails.push('마당 있음')
    } else {
      mismatched.push('필수 조건인 마당이 없어요')
      storageDetails.push('마당 없음')
    }
  } else {
    storageScore += house.hasYard ? 5 : 3
  }

  if (c.farmStorageRequired) {
    if (house.hasStorage || house.hasYard) {
      storageScore += 4
      storageDetails.push('농산물·농기구 보관 가능')
    } else {
      mismatched.push('농산물·농기구 보관 공간이 부족해요')
    }
  } else {
    storageScore += house.hasStorage ? 4 : 3
  }

  breakdown.push({
    key: 'storage',
    label: '창고·마당·보관공간',
    score: round1(Math.min(15, storageScore)),
    max: 15,
    detail: storageDetails.join(' · '),
  })

  // ── 5. 주택 상태와 수리 부담 (15점) ────────────────────────────
  const conditionScore = house.repairBurden === '낮음' ? 14 : house.repairBurden === '보통' ? 10 : 5
  if (house.repairBurden === '낮음') {
    reasons.push({ category: '주택 상태·수리 부담', text: '사진상 수리 부담이 비교적 낮은 편이에요' })
  }
  if (house.repairBurden === '높음') {
    cautions.push('내부 수리 부담이 높은 편이라 수리 범위를 꼼꼼히 확인해야 해요')
  }
  breakdown.push({
    key: 'condition',
    label: '주택 상태·수리 부담',
    score: conditionScore,
    max: 15,
    detail: `수리 부담 ${house.repairBurden} · 예상 수리비 ${repair.min.toLocaleString()}~${repair.max.toLocaleString()}만 원`,
  })

  // ── 6. 생활 기반시설 (10점) ──────────────────────────────────
  let utilityScore = 0
  const utilityDetails: string[] = []
  const utilEntries = [
    ['water', house.utilities.water],
    ['electricity', house.utilities.electricity],
    ['heating', house.utilities.heating],
    ['internet', house.utilities.internet],
  ] as const

  for (const [key, state] of utilEntries) {
    const label = UTILITY_LABELS[key]
    const required = c.requiredUtilities.includes(key)
    if (state === 'yes') {
      utilityScore += 1.5
    } else if (state === 'unknown') {
      // 필수 기반시설이 미확인이면 감점 대신 '현장 확인 필요'로 처리
      utilityScore += required ? 1.5 : 1
      siteCheckNeeded.push(`${label} 상태`)
      utilityDetails.push(`${label} 확인 필요`)
    } else {
      utilityScore += 0.5
      if (required) mismatched.push(`${label} 설비를 새로 갖춰야 할 수 있어요`)
      utilityDetails.push(`${label} 미비`)
    }
  }

  const accessMap = { 좋음: 2, 보통: 1.2, 아쉬움: 0.5 } as const
  utilityScore += accessMap[house.transitAccess]
  utilityScore += accessMap[house.amenityAccess]
  if (c.requiredUtilities.includes('transit') && house.transitAccess === '아쉬움') {
    mismatched.push('대중교통 접근성이 아쉬운 편이에요')
  }
  if (c.requiredUtilities.includes('amenities')) {
    if (house.amenityAccess === '좋음') {
      reasons.push({ category: '생활 인프라', text: '마트·병원 등 생활시설 접근성이 좋아요' })
    } else if (house.amenityAccess === '아쉬움') {
      mismatched.push('생활시설 접근성이 아쉬운 편이에요')
    }
  }

  breakdown.push({
    key: 'utility',
    label: '생활 기반시설',
    score: round1(Math.min(10, utilityScore)),
    max: 10,
    detail: utilityDetails.length > 0 ? utilityDetails.join(' · ') : '기본 설비 확인됨',
  })

  // 사진 분석에서 현장 확인 필요 항목 반영
  for (const item of house.photoAnalysis) {
    if (item.photoConfidence === '부족') {
      siteCheckNeeded.push(`${item.part} 상태 (사진 부족)`)
    }
  }

  const total = Math.max(0, Math.min(100, Math.round(breakdown.reduce((s, b) => s + b.score, 0))))

  // 사용자가 중요하게 고른 조건과 관련된 이유를 앞으로 정렬
  const sortedReasons = [...reasons].sort((a, b) => {
    const ap = c.priorities.includes(a.category) ? 0 : 1
    const bp = c.priorities.includes(b.category) ? 0 : 1
    return ap - bp
  })

  return {
    houseId: house.id,
    total,
    breakdown,
    reasons: sortedReasons.map((r) => r.text).slice(0, 3),
    cautions: [...new Set([...warnings, ...cautions])].slice(0, 2),
    matched: [...new Set(matched)],
    mismatched: [...new Set(mismatched)],
    siteCheckNeeded: [...new Set(siteCheckNeeded)],
    warnings: [...new Set(warnings)],
    initialCost,
  }
}

/** 총점 내림차순, 동점이면 초기 주거비(최소)가 낮은 집 우선 */
export function rankHouses(houses: House[], c: UserConditions): RankedHouse[] {
  const scored = houses.map((house) => ({ house, score: scoreHouse(house, c) }))
  scored.sort((a, b) => {
    if (b.score.total !== a.score.total) return b.score.total - a.score.total
    return a.score.initialCost.min - b.score.initialCost.min
  })
  return scored.map((item, i) => ({ ...item, rank: i + 1 }))
}
