import { describe, expect, it } from 'vitest'
import { SEED_LISTINGS } from '../../data/supplierSeed'
import { MockPhotoAnalysisProvider, validateAnalysisResult } from './index'

describe('Mock 사진 분석 provider', () => {
  it('구조화된 스키마에 맞는 결과를 반환하고 데모 표시를 붙인다', async () => {
    const provider = new MockPhotoAnalysisProvider()
    const result = await provider.analyze(SEED_LISTINGS[0])
    expect(validateAnalysisResult(result)).toBe(true)
    expect(result.isDemo).toBe(true)
    expect(result.provider).toBe('mock')
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.unknowns.length).toBeGreaterThan(0)
  })

  it('일반 매물에는 하자를 만들어내지 않는 보수적 데모 결과를 반환한다', async () => {
    const provider = new MockPhotoAnalysisProvider()
    const generic = { ...structuredClone(SEED_LISTINGS[0]), id: 'unknown-listing' }
    const result = await provider.analyze(generic)
    expect(validateAnalysisResult(result)).toBe(true)
    // 임의 매물에 대해 '높음' 같은 확정적 판정을 만들지 않는다
    for (const issue of result.issues) {
      expect(issue.likelihood).toBe('판단 불가')
      expect(issue.needsSiteCheck).toBe(true)
    }
  })

  it('스키마와 다른 응답은 검증에서 거부된다', () => {
    expect(validateAnalysisResult(null)).toBe(false)
    expect(validateAnalysisResult({ listingId: 'x' })).toBe(false)
    expect(
      validateAnalysisResult({
        listingId: 'x',
        provider: 'mock',
        isDemo: true,
        analyzedAt: 'now',
        unknowns: [],
        issues: [{ id: 'a', part: '벽', feature: '', suspectedRepair: '', likelihood: '아주 높음', burden: '보통', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '' }],
      }),
    ).toBe(false)
  })
})
