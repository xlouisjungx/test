import { REGIONS, type Region } from '../types'
import type { HouseListing, PhotoCategory } from '../types/supplier'
import { PHOTO_CATEGORIES } from '../types/supplier'
import { containsSensitiveInfo, toPublicHouse } from './privacy'

/** 공개 전 검증·사진 완성도·재검토 판단 */

export interface PhotoCompleteness {
  required: PhotoCategory[]
  covered: PhotoCategory[]
  missing: PhotoCategory[]
  percent: number
}

export function photoCompleteness(listing: HouseListing): PhotoCompleteness {
  const required = PHOTO_CATEGORIES.filter((c) => !listing.photoNA.includes(c))
  const coveredSet = new Set(listing.photos.map((p) => p.category))
  const covered = required.filter((c) => coveredSet.has(c))
  const missing = required.filter((c) => !coveredSet.has(c))
  return {
    required,
    covered,
    missing,
    percent: required.length === 0 ? 100 : Math.round((covered.length / required.length) * 100),
  }
}

export interface PublishCheckItem {
  key: string
  label: string
  ok: boolean
  hint: string
}

export function publishChecklist(listing: HouseListing): PublishCheckItem[] {
  const photos = photoCompleteness(listing)
  const basicOk =
    listing.basic.name.trim().length > 0 &&
    REGIONS.includes(listing.basic.region as Region) &&
    listing.basic.floorAreaM2 > 0 &&
    listing.basic.builtYear > 1900 &&
    listing.transaction.dealType !== ''
  const publicJson = JSON.stringify(toPublicHouse(listing))
  const leaks = containsSensitiveInfo(publicJson, listing)

  return [
    {
      key: 'consent',
      label: '소유자 활용 동의 확인',
      ok: listing.consent.consentConfirmed && listing.consent.consentDate !== '',
      hint: '1단계에서 소유자 동의 확인과 확인일을 입력해 주세요.',
    },
    {
      key: 'basic',
      label: '필수 기본정보 입력',
      ok: basicOk,
      hint: '빈집명·지역(읍·면)·연면적·건축연도·거래유형은 필수예요.',
    },
    {
      key: 'photos',
      label: `필수 사진 등록 (${photos.covered.length}/${photos.required.length})`,
      ok: photos.missing.length === 0,
      hint: photos.missing.length > 0 ? `누락: ${photos.missing.slice(0, 4).join(', ')}${photos.missing.length > 4 ? ' 외' : ''}` : '',
    },
    {
      key: 'privacy-photos',
      label: '사진 개인정보 노출 확인',
      ok: listing.photos.length === 0 || listing.photos.every((p) => p.isPublic || !p.isPrimary),
      hint: '얼굴·신분증·우편물 등이 보이는 사진은 비공개로 전환하거나 삭제해 주세요.',
    },
    {
      key: 'analysis',
      label: 'AI 사전분석 완료',
      ok: listing.analysis !== null,
      hint: '사진 등록 후 분석 페이지에서 사전분석을 실행해 주세요.',
    },
    {
      key: 'review',
      label: '분석결과 사람 검토 완료',
      ok: listing.review?.status === 'done',
      hint: 'AI 결과를 검토·수정한 뒤 “검토 완료”를 눌러 주세요.',
    },
    {
      key: 'estimate',
      label: '예상 수리비 검토 완료',
      ok: listing.estimate?.reviewed === true,
      hint: '수리항목 수량과 계산 근거를 확인하고 검토 완료로 표시해 주세요.',
    },
    {
      key: 'fieldChecks',
      label: '현장 확인 항목 확인',
      ok: listing.fieldChecks.length > 0,
      hint: '현장 확인 목록이 비어 있어요.',
    },
    {
      key: 'address',
      label: '공개용 주소 설정',
      ok: !!listing.basic.addressDisclosure,
      hint: '공개 범위(읍·면 / 리 / 방문 확정 후)를 선택해 주세요.',
    },
    {
      key: 'sensitive',
      label: '공개 데이터 민감정보 제거',
      ok: leaks.length === 0,
      hint: leaks.length > 0 ? '공개 데이터에 민감정보가 포함되어 있어요. 입력값을 확인해 주세요.' : '',
    },
  ]
}

export function canPublish(listing: HouseListing): { ok: boolean; failures: PublishCheckItem[] } {
  const checklist = publishChecklist(listing)
  const failures = checklist.filter((c) => !c.ok)
  return { ok: failures.length === 0, failures }
}

/** 공개 후 주요 정보 변경 시 재검토 대상 판단 */
export function needsRereview(prev: HouseListing, next: HouseListing): boolean {
  if (prev.status !== 'published') return false
  const primaryPhoto = (l: HouseListing) => l.photos.find((p) => p.isPrimary)?.id ?? ''
  return (
    prev.transaction.deposit !== next.transaction.deposit ||
    prev.transaction.monthlyRent !== next.transaction.monthlyRent ||
    prev.transaction.salePrice !== next.transaction.salePrice ||
    primaryPhoto(prev) !== primaryPhoto(next) ||
    JSON.stringify(prev.estimate?.items ?? []) !== JSON.stringify(next.estimate?.items ?? []) ||
    prev.farm.truckAccess !== next.farm.truckAccess ||
    prev.farm.hasStorage !== next.farm.hasStorage ||
    prev.farm.hasYard !== next.farm.hasYard ||
    prev.living.water !== next.living.water ||
    prev.living.electricity !== next.living.electricity ||
    prev.living.boilerChecked !== next.living.boilerChecked ||
    prev.basic.addressDisclosure !== next.basic.addressDisclosure
  )
}
