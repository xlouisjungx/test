import { describe, expect, it } from 'vitest'
import { makeDemoListings } from '../data/demo'
import { buildExportPayload, findSensitiveKeys, toPublicListing, validatePublicPayload } from '../services/privacy'

const published = () => makeDemoListings().find((l) => l.status === 'published')!

describe('개인정보 분리', () => {
  it('공개 데이터에 민감정보 키가 포함되지 않는다', () => {
    const pub = toPublicListing(published())
    expect(findSensitiveKeys(pub)).toEqual([])
    const json = JSON.stringify(pub)
    expect(json).not.toContain('홍길동')
    expect(json).not.toContain('010-0000-0000')
    expect(json).not.toContain('가상 주소')
  })

  it('비공개 사진과 제외된 이슈는 공개 데이터에서 빠진다', () => {
    const l = published()
    l.photos[1] = { ...l.photos[1], isPublic: false }
    l.finalIssues![0] = { ...l.finalIssues![0], excluded: true }
    const pub = toPublicListing(l)
    expect(pub.photos.some((p) => p.id === l.photos[1].id)).toBe(false)
    expect(pub.issues.some((i) => i.id === l.finalIssues![0].id)).toBe(false)
  })

  it('공개용 주소는 선택한 범위까지만 표시된다', () => {
    const l = published()
    expect(toPublicListing({ ...l, basic: { ...l.basic, addressPublicLevel: 'town' } }).publicAddress).toBe('제주 애월읍')
    expect(toPublicListing(l).publicAddress).toContain('소길리')
    expect(toPublicListing({ ...l, basic: { ...l.basic, addressPublicLevel: 'after_visit' } }).publicAddress).toContain('방문 확정 후 공개')
  })

  it('내보내기에는 공개 중인 매물만 포함된다', () => {
    const payload = buildExportPayload(makeDemoListings())
    expect(payload.listings.map((l) => l.id)).toEqual(['demo-1'])
    expect(payload.schemaVersion).toBe(1)
  })

  it('내보내기 페이로드가 스키마 검증을 통과한다', () => {
    expect(validatePublicPayload(buildExportPayload(makeDemoListings()))).toEqual([])
  })

  it('민감정보가 포함된 공개 데이터는 검증에서 걸린다', () => {
    const payload = buildExportPayload(makeDemoListings()) as unknown as Record<string, unknown>
    ;(payload.listings as Record<string, unknown>[])[0].ownerContact = '010-1234-5678'
    const errors = validatePublicPayload(payload)
    expect(errors.some((e) => e.includes('민감정보'))).toBe(true)
  })

  it('스키마가 다른 JSON은 오류를 반환한다', () => {
    expect(validatePublicPayload({ schemaVersion: 2 }).length).toBeGreaterThan(0)
    expect(validatePublicPayload({ schemaVersion: 1, listings: [{}] }).length).toBeGreaterThan(0)
    expect(validatePublicPayload(null).length).toBeGreaterThan(0)
  })
})
