import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEYS } from '../data/constants'
import { listingsRepo, visitsRepo } from '../repositories'
import { removeKey } from '../repositories/storage'

beforeEach(() => {
  Object.values(STORAGE_KEYS).forEach(removeKey)
})

describe('매물 저장소', () => {
  it('첫 조회 시 데모 매물 3채가 시드된다', () => {
    const all = listingsRepo.all()
    expect(all).toHaveLength(3)
    expect(all.map((l) => l.status).sort()).toEqual(['analysis_pending', 'published', 'review_required'])
  })

  it('공개 중 매물의 거래가격이 바뀌면 재검토 상태로 전환된다', () => {
    const l = listingsRepo.get('demo-1')!
    expect(l.status).toBe('published')
    const result = listingsRepo.save({
      ...l,
      transaction: { ...l.transaction, monthlyRentManwon: 99 },
    })
    expect(result.ok).toBe(true)
    expect(result.listing.status).toBe('review_required')
    expect(result.listing.review).toBeUndefined()
  })

  it('주요 정보가 아닌 변경(내부 메모)은 공개 상태를 유지한다', () => {
    const l = listingsRepo.get('demo-1')!
    const result = listingsRepo.save({ ...l, internalMemo: '내부 메모' })
    expect(result.listing.status).toBe('published')
  })

  it('보관 처리는 삭제 대신 archived 상태로 바꾼다', () => {
    listingsRepo.archive('demo-1', 'test')
    expect(listingsRepo.get('demo-1')!.status).toBe('archived')
    expect(listingsRepo.all()).toHaveLength(3)
  })

  it('published()는 공개 중인 매물만 반환한다', () => {
    expect(listingsRepo.published().map((l) => l.id)).toEqual(['demo-1'])
  })

  it('복제 시 분석·검토·공개 상태가 초기화된다', () => {
    const copy = listingsRepo.duplicate('demo-1')!
    expect(copy.status).toBe('draft')
    expect(copy.aiResult).toBeUndefined()
    expect(copy.review).toBeUndefined()
    expect(copy.basic.name).toContain('복제')
  })
})

describe('방문 신청 저장소', () => {
  it('데모 방문 신청 3건이 시드된다', () => {
    const all = visitsRepo.all()
    expect(all).toHaveLength(3)
    expect(all.map((v) => v.status).sort()).toEqual(['confirmed', 'received', 'reschedule_requested'])
  })

  it('상태 변경이 이력과 함께 저장된다', () => {
    visitsRepo.setStatus('demo-visit-1', 'confirmed', '테스트 확정', { confirmedDate: '2026-08-03' })
    const v = visitsRepo.get('demo-visit-1')!
    expect(v.status).toBe('confirmed')
    expect(v.confirmedDate).toBe('2026-08-03')
    expect(v.history.at(-1)?.note).toBe('테스트 확정')
  })

  it('존재하지 않는 신청 처리 시 오류를 반환한다', () => {
    const result = visitsRepo.setStatus('no-such-visit', 'confirmed')
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
  })
})
