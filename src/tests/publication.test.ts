import { describe, expect, it } from 'vitest'
import { makeDemoListings } from '../data/demo'
import { canPublish, deriveStatus, publishChecklist } from '../services/publication'

const published = () => makeDemoListings().find((l) => l.status === 'published')!
const partialPhotos = () => makeDemoListings().find((l) => l.id === 'demo-3')!

describe('공개 전 체크리스트', () => {
  it('조건을 모두 충족한 매물은 공개할 수 있다', () => {
    expect(canPublish(published())).toBe(true)
  })

  it('소유자 동의가 확인되지 않으면 공개할 수 없다', () => {
    const l = published()
    l.consent = { ...l.consent, consentConfirmed: false }
    expect(canPublish(l)).toBe(false)
    const item = publishChecklist(l).find((c) => c.key === 'consent')!
    expect(item.ok).toBe(false)
    expect(item.reason).toBeTruthy()
  })

  it('촬영 가이드를 일부만 충족해도 사진이 1장 이상이면 사진 조건을 통과한다', () => {
    const item = publishChecklist(partialPhotos()).find((c) => c.key === 'photos')!
    expect(item.ok).toBe(true)
  })

  it('사진이 한 장도 없으면 사유와 함께 공개할 수 없다', () => {
    const l = partialPhotos()
    l.photos = []
    const item = publishChecklist(l).find((c) => c.key === 'photos')!
    expect(item.ok).toBe(false)
    expect(item.reason).toContain('1장 이상')
    expect(canPublish(l)).toBe(false)
  })

  it('사람 검토 전에는 공개할 수 없다', () => {
    const l = published()
    l.review = undefined
    expect(canPublish(l)).toBe(false)
  })

  it('수리비 검토 전에는 공개할 수 없다', () => {
    const l = published()
    l.estimate = { ...l.estimate!, reviewed: false }
    expect(canPublish(l)).toBe(false)
  })
})

describe('상태 계산', () => {
  it('사진이 없는 매물은 incomplete', () => {
    const l = partialPhotos()
    l.status = 'draft'
    l.photos = []
    expect(deriveStatus(l)).toBe('incomplete')
  })

  it('촬영 가이드 일부만 충족한 매물은 분석 대기로 진행된다', () => {
    const l = partialPhotos()
    l.status = 'draft'
    expect(deriveStatus(l)).toBe('analysis_pending')
  })

  it('사진 완료·분석 전 매물은 analysis_pending', () => {
    const l = published()
    l.status = 'draft'
    l.analysisStatus = 'none'
    l.aiResult = undefined
    l.review = undefined
    expect(deriveStatus(l)).toBe('analysis_pending')
  })

  it('분석 후 미검토 매물은 review_required', () => {
    const l = published()
    l.status = 'draft'
    l.review = undefined
    expect(deriveStatus(l)).toBe('review_required')
  })

  it('모든 조건 충족 시 ready_to_publish', () => {
    const l = published()
    l.status = 'draft'
    expect(deriveStatus(l)).toBe('ready_to_publish')
  })

  it('공개·보관 상태는 그대로 유지된다', () => {
    expect(deriveStatus(published())).toBe('published')
  })
})
