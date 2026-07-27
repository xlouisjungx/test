/**
 * 매물별 실제 사진 파일 매핑 (public/photos 아래 로컬 저장).
 * 사진이 없는 매물·인덱스는 SVG 일러스트로 대체된다.
 */
export const HOUSE_PHOTO_FILES: Record<string, string[]> = {
  'aewol-stonewall': ['/photos/aewol-stonewall/1.jpg', '/photos/aewol-stonewall/2.jpg'],
  'hallim-warehouse': ['/photos/hallim-warehouse/1.jpg', '/photos/hallim-warehouse/2.png'],
  'seongsan-wind': ['/photos/seongsan-wind/1.png', '/photos/seongsan-wind/2.png', '/photos/seongsan-wind/3.png'],
}

export function housePhotoUrl(houseId: string, index = 0): string | null {
  return HOUSE_PHOTO_FILES[houseId]?.[index] ?? null
}
