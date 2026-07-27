import { loadJson, saveJson } from '../utils/storage'

/** 빈집별 현장점검 체크리스트 상태 저장소 (localStorage) */

const keyFor = (houseId: string) => `tjb_checklist_${houseId}`

export function loadChecklist(houseId: string): Record<string, boolean> {
  return loadJson<Record<string, boolean>>(keyFor(houseId)) ?? {}
}

export function saveChecklist(houseId: string, checked: Record<string, boolean>): boolean {
  return saveJson(keyFor(houseId), checked)
}
