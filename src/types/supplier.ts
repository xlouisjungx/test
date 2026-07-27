import type { Level, Region, TriState } from './index'

/** 터잡앙 공급자 사이드 타입 정의 */

export const SUPPLIER_TYPES = ['빈집 소유자', '공인중개사', '지자체·귀농지원기관'] as const
export type SupplierType = (typeof SUPPLIER_TYPES)[number]

export interface SupplierProfile {
  type: SupplierType
  displayName: string
  selectedAt: string
}

/** 소유자 활용 동의 — 수요자에게 공개하지 않는 민감정보 포함 */
export interface OwnerConsent {
  isOwnerSelf: boolean
  /** 민감 */ ownerName: string
  /** 민감 */ ownerContact: string
  utilizationIntent: '임대' | '매매' | '공공사업 연계' | '협의 필요' | ''
  consentConfirmed: boolean
  consentDate: string
  /** 민감 */ consentEvidenceName: string
  /** 민감 */ registrantName: string
  registrantOrg: string
  /** 민감 */ registrantContact: string
}

export const LISTING_STATUSES = [
  'draft',
  'incomplete',
  'analysis_pending',
  'review_required',
  'ready_to_publish',
  'published',
  'paused',
  'archived',
] as const
export type ListingStatus = (typeof LISTING_STATUSES)[number]

export const LISTING_STATUS_META: Record<ListingStatus, { label: string; chip: string }> = {
  draft: { label: '작성 중', chip: 'bg-sand text-stone' },
  incomplete: { label: '정보 미완료', chip: 'bg-tangerine-light text-tangerine-dark' },
  analysis_pending: { label: '분석 대기', chip: 'bg-tangerine-sub/40 text-tangerine-dark' },
  review_required: { label: '검토 필요', chip: 'bg-tangerine text-white' },
  ready_to_publish: { label: '공개 가능', chip: 'bg-leaf text-forest-dark' },
  published: { label: '공개 중', chip: 'bg-forest text-white' },
  paused: { label: '일시 비공개', chip: 'bg-sand text-basalt' },
  archived: { label: '보관', chip: 'bg-stone text-white' },
}

export const HOUSE_TYPES = ['단독주택', '농가주택', '다가구주택', '창고 딸린 주택', '기타'] as const

export interface BasicInfo {
  name: string
  region: Region | '기타'
  /** 민감 — 공개용 주소 설정에 따라 가공 후 공개 */
  fullAddress: string
  addressDisclosure: '읍·면까지만 공개' | '리 단위까지 공개' | '방문 확정 후 공개'
  houseType: string
  floorAreaM2: number
  landAreaM2: number
  builtYear: number
  rooms: number
  baths: number
  floors: number
  vacancyMonths: number
  gradeInfo: string
  buildingRegisterChecked: boolean
  accessible: TriState
  /** 공급자 의견 — 안전진단 아님 */
  habitability: '바로 거주 가능' | '소규모 수리 후 가능' | '상당한 수리 필요' | '판단 불가' | ''
}

export const DEAL_TYPES = ['월세', '전세', '매매', '공공임대', '협의'] as const

export interface TransactionInfo {
  dealType: (typeof DEAL_TYPES)[number] | ''
  deposit: number
  monthlyRent: number
  salePrice: number
  maintenanceFee: number
  minContractMonths: number
  moveInDate: string
  priceNegotiable: boolean
  publicProgramLinked: boolean
  extraTerms: string
  agentName: string
}

export interface FarmEnvironment {
  nearbyCrops: string[]
  farmDistanceKm: number
  farmTravelMinutes: number
  farmLinkAvailable: TriState
  truckAccess: TriState
  machineAccess: TriState
  roadWidthM: number
  turnaround: TriState
  parkingCount: number
  hasStorage: boolean
  storageAreaM2: number
  farmStorage: TriState
  hasYard: boolean
  yardAreaM2: number
  outdoorWater: TriState
  workspace: TriState
  note: string
}

export interface LivingEnvironment {
  water: TriState
  groundwater: TriState
  electricity: TriState
  heatingType: string
  boilerChecked: TriState
  internetAvailable: TriState
  septic: TriState
  wasteDisposal: string
  busStopM: number
  martKm: number
  hospitalKm: number
  townCenterKm: number
  neighborM: number
  mobileSignal: '좋음' | '보통' | '약함' | '확인되지 않음'
  note: string
}

export const PHOTO_CATEGORIES = [
  '건물 정면',
  '건물 측면·후면',
  '지붕·외벽',
  '현관·진입로',
  '거실 전체',
  '방 내부',
  '천장·벽 모서리',
  '바닥',
  '창문·창틀',
  '주방',
  '화장실',
  '전기·수도·난방설비',
  '창고',
  '마당·주차공간',
] as const
export type PhotoCategory = (typeof PHOTO_CATEGORIES)[number]

/** 사진 메타데이터 — 원본 파일은 localStorage에 저장하지 않는다 */
export interface SupplierPhoto {
  id: string
  category: PhotoCategory
  fileName: string
  fileSize: number
  description: string
  takenAt: string
  isPrimary: boolean
  isPublic: boolean
  /** 데모 이미지 여부 (업로드 원본은 세션 내 미리보기만 가능) */
  isDemoImage: boolean
}

export interface VisibleIssue {
  id: string
  part: string
  photoCategory: PhotoCategory | ''
  location: string
  feature: string
  suspectedRepair: string
  likelihood: Level | '판단 불가'
  burden: Level | '판단 불가'
  photoSufficiency: '충분' | '부분 확인' | '판단 불가'
  confidence: '높음' | '보통' | '낮음'
  needsSiteCheck: boolean
  note: string
}

export interface ReviewedIssue extends VisibleIssue {
  excluded: boolean
  editReason: string
}

export interface PhotoAnalysisResult {
  listingId: string
  provider: 'mock' | 'api'
  /** Mock 분석 결과는 반드시 데모 표시 */
  isDemo: boolean
  analyzedAt: string
  issues: VisibleIssue[]
  /** 사진만으로 판단할 수 없는 항목 */
  unknowns: string[]
}

export interface AnalysisReview {
  /** AI 원본 결과 (수정 불가) */
  aiOriginal: PhotoAnalysisResult
  finalIssues: ReviewedIssue[]
  reviewedBy: string
  reviewedAt: string
  reason: string
  status: 'pending' | 'done'
}

export interface RepairEstimateItem {
  id: string
  name: string
  unit: string
  qty: number
  minUnitCost: number
  maxUnitCost: number
  basis: string
  /** 사진만으로 범위 판단이 어려워 현장견적이 필요한 항목 — 합산 제외 */
  needsSiteQuote: boolean
}

export interface RepairEstimate {
  items: RepairEstimateItem[]
  reviewed: boolean
  reviewedAt: string
}

export interface FieldCheckItem {
  id: string
  label: string
  source: 'default' | 'supplier' | 'analysis'
  note: string
}

export interface HouseListing {
  id: string
  version: 1
  createdAt: string
  updatedAt: string
  status: ListingStatus
  supplierType: SupplierType
  consent: OwnerConsent
  basic: BasicInfo
  transaction: TransactionInfo
  farm: FarmEnvironment
  living: LivingEnvironment
  photos: SupplierPhoto[]
  /** "해당 공간 없음"으로 표시한 사진 분류 */
  photoNA: PhotoCategory[]
  analysis: PhotoAnalysisResult | null
  review: AnalysisReview | null
  estimate: RepairEstimate | null
  fieldChecks: FieldCheckItem[]
  /** 민감 — 내부 메모 */
  internalMemo: string
  isDemo: boolean
}

export const VISIT_STATUSES = [
  '신청 접수',
  '확인 중',
  '방문 확정',
  '일정 변경 요청',
  '방문 거절',
  '방문 완료',
  '신청 취소',
] as const
export type VisitStatus = (typeof VISIT_STATUSES)[number]

export const VISIT_STATUS_META: Record<VisitStatus, string> = {
  '신청 접수': 'bg-tangerine text-white',
  '확인 중': 'bg-tangerine-light text-tangerine-dark',
  '방문 확정': 'bg-forest text-white',
  '일정 변경 요청': 'bg-tangerine-sub/40 text-tangerine-dark',
  '방문 거절': 'bg-stone text-white',
  '방문 완료': 'bg-leaf text-forest-dark',
  '신청 취소': 'bg-sand text-stone',
}

export const REJECT_REASONS = [
  '소유자 일정 조율 필요',
  '출입이 어려운 상태',
  '다른 신청과 일정 중복',
  '매물 정보 재검토 중',
  '거래 또는 공개 중단',
  '기타',
] as const

export interface SupplierVisit {
  id: string
  houseId: string
  houseName: string
  name: string
  phone: string
  contact: string
  visitDate: string
  timeSlot: string
  companions: number
  questions: string
  createdAt: string
  status: VisitStatus
  supplierMemo: string
  confirmedDate: string
  proposedDate: string
  rejectReason: string
  updatedAt: string
  isDemo: boolean
}

export interface AuditLog {
  id: string
  at: string
  actor: string
  action: string
  listingId: string
  detail: string
}
