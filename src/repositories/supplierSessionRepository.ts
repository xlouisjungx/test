import type { SupplierProfile } from '../types/supplier'
import { loadJson, removeKey, saveJson } from '../utils/storage'

const KEY = 'teojabang:supplier-session:v1'

export function loadSupplierProfile(): SupplierProfile | null {
  return loadJson<SupplierProfile>(KEY)
}

export function saveSupplierProfile(profile: SupplierProfile): boolean {
  return saveJson(KEY, profile)
}

export function clearSupplierProfile(): void {
  removeKey(KEY)
}
