import type { BurdenLevel, VisibleIssue } from '../types'

/** 공급자용 VisibleIssue와 수요자용 PublicIssue 모두 받도록 실제 사용 필드만 요구한다 */
export type ConditionInput = Pick<VisibleIssue, 'burden' | 'sufficiency' | 'needsFieldCheck'> & {
  excluded?: boolean
}

export interface ConditionSummary {
  /** 종합 수리 부담 — 가장 높은 항목 기준. 판단할 항목이 없으면 unknown */
  overall: BurdenLevel | 'unknown'
  counts: Record<BurdenLevel, number>
  /** 사진으로 판단할 수 없는 항목 수 */
  insufficientCount: number
  /** 현장 확인이 필요한 항목 수 */
  fieldCheckCount: number
  total: number
}

/**
 * 사진 분석 항목에서 상태 판단을 집계한다.
 * 종합 등급은 가중 점수를 만들지 않고 '가장 높은 부담'을 그대로 쓴다.
 * 임의의 점수를 만들면 근거 없는 정밀도를 주장하게 되고, 적합도 점수는
 * 수요자 사이드에서 계산해야 하기 때문이다.
 */
export function conditionSummary(issues: ConditionInput[]): ConditionSummary {
  const active = issues.filter((i) => !i.excluded)
  const counts: Record<BurdenLevel, number> = { low: 0, medium: 0, high: 0 }
  for (const i of active) counts[i.burden] += 1
  return {
    overall:
      active.length === 0 ? 'unknown' : counts.high > 0 ? 'high' : counts.medium > 0 ? 'medium' : 'low',
    counts,
    insufficientCount: active.filter((i) => i.sufficiency === 'insufficient').length,
    fieldCheckCount: active.filter((i) => i.needsFieldCheck).length,
    total: active.length,
  }
}
