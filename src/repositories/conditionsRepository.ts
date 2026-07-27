import type { UserConditions } from '../types'
import { loadJson, removeKey, saveJson } from '../utils/storage'

/** 사용자 조건 저장소. 현재는 localStorage, 추후 API로 교체 가능. */

const KEY = 'tjb_conditions'

export function loadConditions(): UserConditions | null {
  return loadJson<UserConditions>(KEY)
}

export function saveConditions(conditions: UserConditions): boolean {
  return saveJson(KEY, conditions)
}

export function clearConditions(): void {
  removeKey(KEY)
}
