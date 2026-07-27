// localStorage 접근 계층 — 테스트(node) 환경에서는 메모리 저장소로 대체

const memory = new Map<string, string>()

function backend(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  if (typeof localStorage !== 'undefined') return localStorage
  return {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => void memory.set(k, v),
    removeItem: (k) => void memory.delete(k),
  }
}

export interface SaveResult {
  ok: boolean
  /** 저장 실패 사유(용량 초과 등) */
  error?: string
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = backend().getItem(key)
    if (raw == null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): SaveResult {
  try {
    backend().setItem(key, JSON.stringify(value))
    return { ok: true }
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)
    return {
      ok: false,
      error: quota
        ? '브라우저 저장 용량이 초과되어 저장하지 못했습니다. 사진 수를 줄이거나 기존 매물의 사진을 정리한 뒤 다시 시도하세요.'
        : '저장에 실패했습니다. 브라우저 설정(시크릿 모드, 저장소 차단 여부)을 확인한 뒤 다시 시도하세요.',
    }
  }
}

export function removeKey(key: string) {
  backend().removeItem(key)
}

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}
