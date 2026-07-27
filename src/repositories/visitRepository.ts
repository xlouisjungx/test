import type { VisitRequest, VisitRequestInput } from '../types'
import { loadJson, saveJson } from '../utils/storage'

/**
 * 방문 신청 저장소.
 * 외부 시스템으로 전송하지 않고 localStorage에 보관한다 (추후 API로 교체 가능).
 */

const KEY = 'tjb_visit_requests'

function makeRequestNumber(): string {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  const randPart = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `TJ-${datePart}-${randPart}`
}

export async function saveVisitRequest(input: VisitRequestInput): Promise<VisitRequest> {
  // 실제 API 전송을 흉내낸 비동기 처리
  await new Promise((resolve) => setTimeout(resolve, 400))

  const request: VisitRequest = {
    ...input,
    id: makeRequestNumber(),
    createdAt: new Date().toISOString(),
  }

  const existing = loadJson<VisitRequest[]>(KEY) ?? []
  const ok = saveJson(KEY, [...existing, request])
  if (!ok) {
    throw new Error('방문 신청을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  return request
}

export function getVisitRequests(): VisitRequest[] {
  return loadJson<VisitRequest[]>(KEY) ?? []
}

export function getVisitRequestById(id: string): VisitRequest | null {
  return getVisitRequests().find((r) => r.id === id) ?? null
}

export function getLatestVisitRequest(): VisitRequest | null {
  const all = getVisitRequests()
  return all.length > 0 ? all[all.length - 1] : null
}
