import { describe, expect, it } from 'vitest'
import { SEED_LISTINGS } from '../data/supplierSeed'
import type { HouseListing } from '../types/supplier'
import { canPublish, needsRereview, photoCompleteness, publishChecklist } from './publication'

const published = SEED_LISTINGS.find((l) => l.status === 'published')!
const incomplete = SEED_LISTINGS.find((l) => l.status === 'incomplete')!
const reviewRequired = SEED_LISTINGS.find((l) => l.status === 'review_required')!

const clone = (l: HouseListing): HouseListing => structuredClone(l)

describe('공개 전 체크리스트', () => {
  it('모든 조건을 충족한 매물은 공개할 수 있다', () => {
    expect(canPublish(published).ok).toBe(true)
  })

  it('소유자 동의가 확인되지 않으면 공개할 수 없다', () => {
    const l = clone(published)
    l.consent.consentConfirmed = false
    const check = canPublish(l)
    expect(check.ok).toBe(false)
    expect(check.failures.some((f) => f.key === 'consent')).toBe(true)
  })

  it('필수 사진이 누락되면 공개할 수 없고 누락 분류가 표시된다', () => {
    const check = canPublish(incomplete)
    expect(check.ok).toBe(false)
    const photoFail = check.failures.find((f) => f.key === 'photos')
    expect(photoFail).toBeDefined()
    expect(photoFail!.hint).toContain('누락')
  })

  it('분석 검토가 완료되지 않으면 공개할 수 없다', () => {
    const check = canPublish(reviewRequired)
    expect(check.ok).toBe(false)
    expect(check.failures.some((f) => f.key === 'review')).toBe(true)
  })

  it('체크리스트는 실패 이유 힌트를 제공한다', () => {
    for (const item of publishChecklist(incomplete).filter((c) => !c.ok)) {
      expect(item.hint.length).toBeGreaterThan(0)
    }
  })
})

describe('사진 완성도', () => {
  it('해당 공간 없음(NA) 분류는 필수에서 제외된다', () => {
    const pc = photoCompleteness(incomplete) // 창고 NA
    expect(pc.required).not.toContain('창고')
    expect(pc.missing.length).toBeGreaterThan(0)
    expect(pc.percent).toBeLessThan(100)
  })

  it('모든 필수 분류가 등록되면 100%가 된다', () => {
    const pc = photoCompleteness(published)
    expect(pc.missing).toEqual([])
    expect(pc.percent).toBe(100)
  })
})

describe('공개 후 재검토', () => {
  it('공개 중 매물의 거래가격이 바뀌면 재검토 대상이다', () => {
    const next = clone(published)
    next.transaction.deposit += 500
    expect(needsRereview(published, next)).toBe(true)
  })

  it('공개 중 매물의 창고 정보가 바뀌면 재검토 대상이다', () => {
    const next = clone(published)
    next.farm.hasStorage = !next.farm.hasStorage
    expect(needsRereview(published, next)).toBe(true)
  })

  it('사소한 변경(내부 메모)은 재검토 대상이 아니다', () => {
    const next = clone(published)
    next.internalMemo = '메모 수정'
    expect(needsRereview(published, next)).toBe(false)
  })

  it('공개 전 매물은 재검토 대상이 아니다', () => {
    const next = clone(reviewRequired)
    next.transaction.deposit += 500
    expect(needsRereview(reviewRequired, next)).toBe(false)
  })
})
