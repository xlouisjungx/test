import { loadJson, saveJson } from './storage'

/** MVP 검증용 이벤트 기록. 외부 분석도구 대신 localStorage + 콘솔에 남긴다. */

export type EventName =
  | 'conditions_started'
  | 'conditions_submitted'
  | 'recommendation_viewed'
  | 'comparison_viewed'
  | 'house_detail_viewed'
  | 'visit_request_started'
  | 'visit_request_completed'
  | 'supplier_role_selected'
  | 'listing_started'
  | 'listing_draft_saved'
  | 'owner_consent_confirmed'
  | 'photos_uploaded'
  | 'photo_requirements_completed'
  | 'analysis_started'
  | 'analysis_completed'
  | 'analysis_reviewed'
  | 'listing_previewed'
  | 'listing_published'
  | 'listing_paused'
  | 'visit_request_viewed'
  | 'visit_confirmed'
  | 'visit_reschedule_requested'
  | 'visit_completed'

export interface TrackedEvent {
  name: EventName
  houseId?: string
  supplierType?: string
  at: string
}

const EVENTS_KEY = 'teojabang:events:v1'
const MAX_EVENTS = 300

export function trackEvent(name: EventName, houseId?: string, supplierType?: string): void {
  const event: TrackedEvent = {
    name,
    ...(houseId ? { houseId } : {}),
    ...(supplierType ? { supplierType } : {}),
    at: new Date().toISOString(),
  }
  const events = loadJson<TrackedEvent[]>(EVENTS_KEY) ?? []
  events.push(event)
  saveJson(EVENTS_KEY, events.slice(-MAX_EVENTS))
  console.info('[터잡앙 이벤트]', event)
}

export function getEvents(): TrackedEvent[] {
  return loadJson<TrackedEvent[]>(EVENTS_KEY) ?? []
}
