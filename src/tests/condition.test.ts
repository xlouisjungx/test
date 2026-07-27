import { describe, expect, it } from 'vitest'
import type { BurdenLevel, PhotoSufficiency, VisibleIssue } from '../types'
import { conditionSummary } from '../services/condition'

function issue(
  id: string,
  burden: BurdenLevel,
  opts: { sufficiency?: PhotoSufficiency; needsFieldCheck?: boolean; excluded?: boolean } = {},
): VisibleIssue {
  return {
    id,
    photoIds: [],
    area: '벽',
    location: '테스트',
    observation: '테스트 관찰',
    suspectedRepairs: [],
    repairLikelihood: 'possible',
    burden,
    sufficiency: opts.sufficiency ?? 'sufficient',
    confidence: 'medium',
    needsFieldCheck: opts.needsFieldCheck ?? false,
    excluded: opts.excluded,
  }
}

describe('상태 판단 집계', () => {
  it('종합 등급은 가장 높은 부담을 따른다', () => {
    expect(conditionSummary([issue('a', 'low'), issue('b', 'high'), issue('c', 'medium')]).overall).toBe('high')
    expect(conditionSummary([issue('a', 'low'), issue('b', 'medium')]).overall).toBe('medium')
    expect(conditionSummary([issue('a', 'low')]).overall).toBe('low')
  })

  it('판단할 항목이 없으면 unknown — low(부담 낮음)으로 처리하지 않는다', () => {
    expect(conditionSummary([]).overall).toBe('unknown')
  })

  it('제외된 항목은 집계에서 빠진다', () => {
    const s = conditionSummary([issue('a', 'low'), issue('b', 'high', { excluded: true })])
    expect(s.overall).toBe('low')
    expect(s.total).toBe(1)
    expect(s.counts.high).toBe(0)
  })

  it('제외로 남는 항목이 없으면 unknown이 된다', () => {
    expect(conditionSummary([issue('a', 'high', { excluded: true })]).overall).toBe('unknown')
  })

  it('등급별 개수를 집계한다', () => {
    const s = conditionSummary([issue('a', 'low'), issue('b', 'low'), issue('c', 'medium')])
    expect(s.counts).toEqual({ low: 2, medium: 1, high: 0 })
  })

  it("판단 불가·현장 확인 필요 항목 수를 센다", () => {
    const s = conditionSummary([
      issue('a', 'medium', { sufficiency: 'insufficient', needsFieldCheck: true }),
      issue('b', 'low', { sufficiency: 'partial', needsFieldCheck: true }),
      issue('c', 'low'),
    ])
    expect(s.insufficientCount).toBe(1)
    expect(s.fieldCheckCount).toBe(2)
  })
})
