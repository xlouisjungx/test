import type { HouseListing } from '../types'
import { photoCompleteness } from './photos'

export interface PublishCheckItem {
  key: string
  label: string
  ok: boolean
  reason?: string
}

/** 공개 전 체크리스트 — 하나라도 미충족이면 공개할 수 없다 */
export function publishChecklist(listing: HouseListing): PublishCheckItem[] {
  const b = listing.basic
  const completeness = photoCompleteness(listing.photos, listing.photoNA)
  const basicOk = Boolean(b.name && b.region && b.houseType)
  const consentOk =
    listing.consent.consentConfirmed && Boolean(listing.consent.ownerName) && Boolean(listing.consent.ownerContact)

  return [
    {
      key: 'consent',
      label: '소유자 활용 동의 확인',
      ok: consentOk,
      reason: consentOk ? undefined : '1단계에서 소유자 정보 입력과 동의 확인이 필요합니다.',
    },
    {
      key: 'basic',
      label: '필수 기본정보 입력',
      ok: basicOk,
      reason: basicOk ? undefined : '빈집명·지역·주택유형을 입력해야 합니다.',
    },
    {
      key: 'photos',
      label: '사진 등록',
      // 촬영 가이드는 권장 사항이며, 공개 조건은 사진 1장 이상이다
      ok: listing.photos.length > 0,
      reason:
        listing.photos.length > 0
          ? undefined
          : `사진을 1장 이상 등록하세요. (촬영 가이드 ${completeness.registered}/${completeness.requiredTotal}개 분류 충족 — 권장)`,
    },
    {
      key: 'privacy',
      label: '개인정보 노출 확인',
      ok: listing.publishConfirmations.privacyChecked,
      reason: listing.publishConfirmations.privacyChecked
        ? undefined
        : '사진에 얼굴·신분증·연락처 등 개인정보가 없는지 확인하고 체크하세요.',
    },
    {
      key: 'analysis',
      label: 'AI 분석 완료',
      ok: listing.aiResult != null && listing.analysisStatus !== 'none' && listing.analysisStatus !== 'failed',
      reason: listing.aiResult != null ? undefined : 'AI 사전분석을 실행해야 합니다.',
    },
    {
      key: 'review',
      label: '분석결과 사람 검토 완료',
      ok: listing.review != null,
      reason: listing.review != null ? undefined : '분석 페이지에서 결과를 검토·승인해야 합니다.',
    },
    {
      key: 'estimate',
      label: '예상 수리비 검토 완료',
      ok: listing.estimate?.reviewed === true,
      reason: listing.estimate?.reviewed ? undefined : '수리비 수량과 범위를 검토·확정해야 합니다.',
    },
    {
      key: 'fieldCheck',
      label: '현장 확인 항목 확인',
      ok: listing.publishConfirmations.fieldCheckChecked && listing.fieldCheckItems.length > 0,
      reason: listing.publishConfirmations.fieldCheckChecked
        ? undefined
        : '현장 확인 필요 항목을 확인하고 체크하세요.',
    },
    {
      key: 'address',
      label: '공개용 주소 설정',
      ok: Boolean(b.addressPublicLevel) && (b.addressPublicLevel !== 'ri' || Boolean(b.ri)),
      reason:
        b.addressPublicLevel === 'ri' && !b.ri
          ? "'리 단위까지 공개'를 선택한 경우 리 이름을 입력해야 합니다."
          : undefined,
    },
    {
      key: 'safety',
      label: '안전 안내문구 확인',
      ok: listing.publishConfirmations.safetyNoticeChecked,
      reason: listing.publishConfirmations.safetyNoticeChecked
        ? undefined
        : '수요자에게 표시되는 안전 안내문구를 확인하고 체크하세요.',
    },
  ]
}

export function canPublish(listing: HouseListing): boolean {
  return publishChecklist(listing).every((c) => c.ok)
}

/**
 * 고정 상태(공개·일시비공개·보관)가 아닌 매물의 상태를 입력 진행도에서 계산한다.
 */
export function deriveStatus(listing: HouseListing): HouseListing['status'] {
  if (listing.status === 'published' || listing.status === 'paused' || listing.status === 'archived') {
    return listing.status
  }
  const checks = publishChecklist(listing)
  const get = (key: string) => checks.find((c) => c.key === key)!
  if (!get('consent').ok || !get('basic').ok) return 'draft'
  if (!get('photos').ok) return 'incomplete'
  if (listing.analysisStatus === 'none' || listing.analysisStatus === 'failed') return 'analysis_pending'
  if (listing.review == null || listing.estimate?.reviewed !== true) return 'review_required'
  return checks.every((c) => c.ok) ? 'ready_to_publish' : 'review_required'
}

/**
 * 공개 중 매물의 주요 정보 변경 감지용 서명.
 * 서명이 달라지면 재검토 상태로 되돌린다.
 */
export function significantSignature(listing: HouseListing): string {
  return JSON.stringify([
    listing.transaction.type,
    listing.transaction.depositManwon,
    listing.transaction.monthlyRentManwon,
    listing.transaction.salePriceManwon,
    listing.photos.find((p) => p.isPrimary)?.id ?? null,
    (listing.finalIssues ?? []).filter((i) => !i.excluded).map((i) => [i.id, i.burden, i.suspectedRepairs]),
    listing.estimate ? [listing.estimate.totalMinManwon, listing.estimate.totalMaxManwon] : null,
    listing.farm.truckAccess,
    listing.farm.hasStorage,
    listing.farm.hasYard,
    listing.living.waterSupply,
    listing.living.electricity,
    listing.living.heating,
    listing.basic.addressPublicLevel,
  ])
}
