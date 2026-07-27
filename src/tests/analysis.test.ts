import { describe, expect, it } from 'vitest'
import { makeDemoListings } from '../data/demo'
import { MockPhotoAnalysisProvider, validateAnalysisResult } from '../providers/photo-analysis'

describe('AI Mock 분석', () => {
  it('구조화된 스키마 검증을 통과하는 결과를 반환한다', async () => {
    const listing = makeDemoListings()[0]
    const result = await new MockPhotoAnalysisProvider().analyze(listing)
    expect(validateAnalysisResult(result)).toEqual([])
    expect(result.isDemo).toBe(true)
    expect(result.provider).toBe('mock')
    expect(result.issues.length).toBeGreaterThan(0)
    // 모든 이슈가 실제 등록된 사진을 참조한다
    const photoIds = new Set(listing.photos.map((p) => p.id))
    for (const issue of result.issues) {
      expect(issue.photoIds.every((id) => photoIds.has(id))).toBe(true)
    }
  }, 10000)

  it('사진이 없으면 오류를 던진다', async () => {
    const listing = { ...makeDemoListings()[0], photos: [] }
    await expect(new MockPhotoAnalysisProvider().analyze(listing)).rejects.toThrow('사진')
  })

  it("판단 불가 항목이 '이상 없음'이 아닌 uncheckable 목록으로 반환된다", async () => {
    const result = await new MockPhotoAnalysisProvider().analyze(makeDemoListings()[0])
    expect(result.uncheckable.length).toBeGreaterThan(0)
    expect(result.uncheckable).toContain('내부 배관 상태')
  }, 10000)
})

describe('분석 응답 스키마 검증', () => {
  it('형식이 다른 응답은 오류 목록을 반환한다', () => {
    expect(validateAnalysisResult(null).length).toBeGreaterThan(0)
    expect(validateAnalysisResult({}).length).toBeGreaterThan(0)
    expect(
      validateAnalysisResult({
        id: 'x',
        provider: 'mock',
        isDemo: true,
        analyzedAt: 'now',
        uncheckable: [],
        issues: [{ id: 'i', photoIds: [], area: '벽', observation: '관찰', suspectedRepairs: ['unknown_key'], burden: 'extreme', sufficiency: 'partial', repairLikelihood: 'possible', confidence: 'high', needsFieldCheck: true }],
      }).length,
    ).toBeGreaterThan(0)
  })
})
