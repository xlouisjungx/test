import type { HousePhoto, PhotoCategory, PhotoCompleteness } from '../types'
import { PHOTO_CATEGORY_META, REQUIRED_PHOTO_CATEGORIES } from '../data/constants'

export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024 // 10MB
export const MIN_PHOTO_WIDTH = 480
export const MIN_PHOTO_HEIGHT = 360

/**
 * 필수 사진 분류 대비 등록 완성도.
 * '해당 공간 없음'(NA)으로 표시한 분류는 필수에서 제외한다.
 */
export function photoCompleteness(photos: HousePhoto[], notApplicable: PhotoCategory[]): PhotoCompleteness {
  const na = notApplicable.filter((c) => PHOTO_CATEGORY_META[c]?.naAllowed)
  const required = REQUIRED_PHOTO_CATEGORIES.filter((c) => !na.includes(c))
  const covered = required.filter((c) => photos.some((p) => p.category === c))
  const missing = required.filter((c) => !covered.includes(c))
  const percent = required.length === 0 ? 100 : Math.round((covered.length / required.length) * 100)
  return {
    requiredTotal: required.length,
    registered: covered.length,
    notApplicable: na,
    missing,
    percent,
  }
}

export interface FileValidationError {
  fileName: string
  reason: string
}

/**
 * 업로드 파일 기본 검증(형식·크기·중복). AI 품질 분석이 아닌 단순 규칙 검사다.
 * 해상도 검사는 이미지 로드가 필요하므로 UI 계층에서 수행한다.
 */
export function validatePhotoFile(
  file: { name: string; type: string; size: number },
  existing: HousePhoto[],
): FileValidationError | null {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { fileName: file.name, reason: '지원하지 않는 파일 형식입니다. JPG, PNG, WEBP 파일만 등록할 수 있습니다.' }
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { fileName: file.name, reason: '파일 크기가 10MB를 초과합니다. 크기를 줄인 뒤 다시 등록하세요.' }
  }
  if (existing.some((p) => p.fileName === file.name)) {
    return { fileName: file.name, reason: '같은 이름의 파일이 이미 등록되어 있습니다. 파일명을 바꾸거나 기존 사진을 삭제하세요.' }
  }
  return null
}
