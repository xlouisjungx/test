import { describe, expect, it } from 'vitest'
import type { HousePhoto } from '../types'
import { REQUIRED_PHOTO_CATEGORIES } from '../data/constants'
import { photoCompleteness, validatePhotoFile } from '../services/photos'

function photo(category: HousePhoto['category'], name = `${category}.jpg`): HousePhoto {
  return { id: `p-${category}`, category, fileName: name, isPrimary: false, isPublic: true, order: 0 }
}

describe('사진 완성도', () => {
  it('필수 14개 분류가 모두 있으면 100%', () => {
    const photos = REQUIRED_PHOTO_CATEGORIES.map((c) => photo(c))
    const c = photoCompleteness(photos, [])
    expect(c.percent).toBe(100)
    expect(c.missing).toEqual([])
  })

  it('누락 분류가 정확히 표시된다', () => {
    const photos = REQUIRED_PHOTO_CATEGORIES.filter((c) => c !== 'kitchen' && c !== 'storage').map((c) => photo(c))
    const c = photoCompleteness(photos, [])
    expect(c.missing).toContain('kitchen')
    expect(c.missing).toContain('storage')
    expect(c.percent).toBeLessThan(100)
  })

  it("'해당 공간 없음' 분류는 필수에서 제외된다", () => {
    const photos = REQUIRED_PHOTO_CATEGORIES.filter((c) => c !== 'storage' && c !== 'yard_parking').map((c) => photo(c))
    const c = photoCompleteness(photos, ['storage', 'yard_parking'])
    expect(c.percent).toBe(100)
    expect(c.requiredTotal).toBe(12)
  })

  it("NA가 허용되지 않는 분류(주방 등)는 '해당 공간 없음'으로 지정해도 무시된다", () => {
    const photos = REQUIRED_PHOTO_CATEGORIES.filter((c) => c !== 'kitchen').map((c) => photo(c))
    const c = photoCompleteness(photos, ['kitchen'])
    expect(c.percent).toBeLessThan(100)
    expect(c.missing).toContain('kitchen')
  })
})

describe('파일 검증', () => {
  it('지원하지 않는 형식은 거부한다', () => {
    const err = validatePhotoFile({ name: 'a.gif', type: 'image/gif', size: 1000 }, [])
    expect(err?.reason).toContain('형식')
  })

  it('10MB 초과 파일은 거부한다', () => {
    const err = validatePhotoFile({ name: 'a.jpg', type: 'image/jpeg', size: 11 * 1024 * 1024 }, [])
    expect(err?.reason).toContain('10MB')
  })

  it('중복 파일명은 거부한다', () => {
    const err = validatePhotoFile({ name: 'front.jpg', type: 'image/jpeg', size: 1000 }, [photo('front')])
    expect(err?.reason).toContain('이미 등록')
  })

  it('정상 파일은 통과한다', () => {
    expect(validatePhotoFile({ name: 'new.jpg', type: 'image/jpeg', size: 1000 }, [photo('front')])).toBeNull()
  })
})
