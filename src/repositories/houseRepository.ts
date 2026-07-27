import { DEMO_HOUSES } from '../data/houses'
import { toPublicHouse } from '../services/privacy'
import type { House } from '../types'
import { getPublishedListings } from './listingsRepository'

/**
 * 빈집 매물 저장소 (수요자 사이드).
 * 기본 데모 3채에 더해, 공급자 사이드에서 '공개 중' 상태인 매물을
 * 민감정보 제거 변환(toPublicHouse) 후 함께 제공한다.
 * 같은 id의 공개 매물이 있으면 공급자 데이터가 우선한다.
 */

const FAKE_LATENCY_MS = 250

function mergedHouses(): House[] {
  const map = new Map<string, House>(DEMO_HOUSES.map((h) => [h.id, h]))
  try {
    for (const listing of getPublishedListings()) {
      map.set(listing.id, toPublicHouse(listing))
    }
  } catch {
    // 공급자 데이터를 읽지 못해도 수요자 데모는 유지한다
  }
  return [...map.values()]
}

export function getHouses(): Promise<House[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mergedHouses()), FAKE_LATENCY_MS)
  })
}

export function getHouseById(id: string): Promise<House | null> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mergedHouses().find((h) => h.id === id) ?? null), FAKE_LATENCY_MS)
  })
}
