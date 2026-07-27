// 터잡앙 공유 타입 — 수요자 사이드와 호환되는 데이터 구조

export type SupplierRole = 'owner' | 'agent' | 'institution'

/** 확인 3상태: 확인되지 않은 항목은 '없음'이 아니라 'unknown'으로 저장한다 */
export type Tri = 'yes' | 'no' | 'unknown'

export interface SupplierProfile {
  role: SupplierRole
  selectedAt: string
}

// ---------- 1단계: 매물 출처와 활용 동의 ----------
export type UtilizationIntent = 'rent' | 'sale' | 'public_program' | 'negotiable'

export interface OwnerConsent {
  isOwnerSelf: boolean
  ownerName: string
  ownerContact: string
  intent: UtilizationIntent
  /** 공급자가 제출한 정보 기준의 동의 확인 — 법률 검증이 아님 */
  consentConfirmed: boolean
  consentDate?: string
  evidenceFileName?: string
  managerName?: string
  managerOrg?: string
  managerContact?: string
}

// ---------- 2단계: 기본정보 ----------
export type AddressPublicLevel = 'town' | 'ri' | 'after_visit'
export type LivableOpinion = 'ready' | 'minor_repair' | 'major_repair' | 'unknown'

export interface HouseBasicInfo {
  name: string
  region: string
  /** 리 단위(선택) — 공개 수준이 'ri'일 때 사용 */
  ri?: string
  /** 민감정보: 수요자에게 비공개 */
  addressDetail?: string
  addressPublicLevel: AddressPublicLevel
  houseType: string
  floorAreaM2?: number
  landAreaM2?: number
  builtYear?: number
  rooms?: number
  baths?: number
  floors?: number
  vacantMonths?: number
  gradeInfo?: string
  buildingRegisterChecked: Tri
  accessible: Tri
  /** 공급자 의견 — 안전진단 결과가 아님 */
  livableOpinion: LivableOpinion
}

// ---------- 3단계: 거래조건 (금액 단위: 만 원) ----------
export type TransactionType = 'monthly' | 'jeonse' | 'sale' | 'public_rent' | 'negotiable'

export interface TransactionInfo {
  type: TransactionType
  depositManwon?: number
  monthlyRentManwon?: number
  salePriceManwon?: number
  maintenanceFeeManwon?: number
  minContractMonths?: number
  moveInDate?: string
  priceNegotiable: boolean
  publicProgramLinked: boolean
  extraTerms?: string
  /** 내부 정보: 수요자에게 비공개 */
  agentName?: string
}

// ---------- 4단계: 영농조건 ----------
export interface FarmEnvironment {
  crops: string[]
  farmDistanceKm?: number
  farmDriveMinutes?: number
  farmlandLinkage: Tri
  truckAccess: Tri
  machineAccess: Tri
  roadWidthM?: number
  turnaround: Tri
  parkingCount?: number
  hasStorage: Tri
  storageAreaM2?: number
  storageUsable: Tri
  hasYard: Tri
  yardAreaM2?: number
  outdoorWater: Tri
  workspace: Tri
  note?: string
}

// ---------- 5단계: 생활조건 ----------
export interface LivingEnvironment {
  waterSupply: Tri
  groundwater: Tri
  electricity: Tri
  heating: string
  boilerChecked: Tri
  internetAvailable: Tri
  sewage: string
  trashSite?: string
  busStopDistanceM?: number
  martDistanceKm?: number
  hospitalDistanceKm?: number
  townCenterDistanceKm?: number
  neighborDistanceM?: number
  mobileSignal: 'good' | 'weak' | 'unknown'
  note?: string
}

// ---------- 6단계: 사진 ----------
export type PhotoCategory =
  | 'front'
  | 'side_back'
  | 'roof_wall'
  | 'entrance'
  | 'living'
  | 'room'
  | 'ceiling_corner'
  | 'floor'
  | 'window'
  | 'kitchen'
  | 'bathroom'
  | 'utility'
  | 'storage'
  | 'yard_parking'

export interface HousePhoto {
  id: string
  category: PhotoCategory | 'etc'
  fileName: string
  /** 축소본 데이터 URL(원본은 저장하지 않음) */
  dataUrl?: string
  caption?: string
  takenAt?: string
  isPrimary: boolean
  isPublic: boolean
  order: number
}

export interface PhotoCompleteness {
  requiredTotal: number
  registered: number
  notApplicable: PhotoCategory[]
  missing: PhotoCategory[]
  percent: number
}

// ---------- AI 분석 ----------
export type BurdenLevel = 'low' | 'medium' | 'high'
export type PhotoSufficiency = 'sufficient' | 'partial' | 'insufficient'
export type RepairLikelihood = 'likely' | 'possible' | 'unknown'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type RepairItemKey =
  | 'wallpaper_paint'
  | 'flooring'
  | 'window'
  | 'bathroom'
  | 'kitchen'
  | 'waterproof'
  | 'exterior_wall'
  | 'demolition'
  | 'structure'
  | 'asbestos'
  | 'plumbing'
  | 'electric'

export interface VisibleIssue {
  id: string
  photoIds: string[]
  area: string
  location: string
  observation: string
  suspectedRepairs: RepairItemKey[]
  repairLikelihood: RepairLikelihood
  burden: BurdenLevel
  sufficiency: PhotoSufficiency
  confidence: ConfidenceLevel
  needsFieldCheck: boolean
  note?: string
  /** 검토에서 제외된 항목(수요자에게 비공개) */
  excluded?: boolean
  editReason?: string
}

export interface PhotoAnalysisResult {
  id: string
  provider: 'mock' | 'api'
  isDemo: boolean
  analyzedAt: string
  issues: VisibleIssue[]
  /** 사진으로 판단할 수 없는 항목 */
  uncheckable: string[]
}

export interface AnalysisReview {
  reviewedBy: string
  reviewedAt: string
  reason?: string
}

// ---------- 수리비 ----------
export interface RepairEstimateItem {
  key: RepairItemKey
  label: string
  unit: string
  quantity: number
  minRateManwon: number
  maxRateManwon: number
  minCostManwon: number
  maxCostManwon: number
  basis: string
  needsFieldQuote: boolean
}

export interface RepairEstimate {
  items: RepairEstimateItem[]
  totalMinManwon: number
  totalMaxManwon: number
  reviewed: boolean
  reviewedAt?: string
}

export interface FieldCheckItem {
  id: string
  label: string
  note?: string
  custom: boolean
}

// ---------- 매물 ----------
export type ListingStatus =
  | 'draft'
  | 'incomplete'
  | 'analysis_pending'
  | 'review_required'
  | 'ready_to_publish'
  | 'published'
  | 'paused'
  | 'archived'

export type AnalysisStatus = 'none' | 'running' | 'done' | 'review_required' | 'reviewed' | 'failed'

export interface PublishConfirmations {
  privacyChecked: boolean
  safetyNoticeChecked: boolean
  fieldCheckChecked: boolean
}

export interface HouseListing {
  id: string
  schemaVersion: 1
  createdAt: string
  updatedAt: string
  supplierRole: SupplierRole
  status: ListingStatus
  isDemo: boolean
  consent: OwnerConsent
  basic: HouseBasicInfo
  transaction: TransactionInfo
  farm: FarmEnvironment
  living: LivingEnvironment
  photos: HousePhoto[]
  /** '해당 공간 없음'으로 표시한 필수 사진 분류 */
  photoNA: PhotoCategory[]
  analysisStatus: AnalysisStatus
  /** AI 원본 결과(수정 불가, 보존) */
  aiResult?: PhotoAnalysisResult
  /** 공급자 검토를 거친 최종 결과 */
  finalIssues?: VisibleIssue[]
  review?: AnalysisReview
  estimate?: RepairEstimate
  fieldCheckItems: FieldCheckItem[]
  publishConfirmations: PublishConfirmations
  /** 내부 메모: 수요자에게 비공개 */
  internalMemo?: string
  publishedAt?: string
  formStep?: number
}

// ---------- 방문 신청 ----------
export type VisitStatus =
  | 'received'
  | 'checking'
  | 'confirmed'
  | 'reschedule_requested'
  | 'rejected'
  | 'completed'
  | 'cancelled'

export interface VisitRequest {
  id: string
  no: string
  listingId: string
  applicantName: string
  /** 민감정보: 공개 데이터에 포함 금지 */
  applicantContact: string
  requestedAt: string
  preferredDate: string
  preferredTime: string
  companions: number
  questions?: string
  status: VisitStatus
  confirmedDate?: string
  confirmedTime?: string
  proposedDate?: string
  proposedTime?: string
  rejectReason?: string
  supplierMemo?: string
  history: { at: string; status: VisitStatus; note?: string }[]
  isDemo: boolean
}

// ---------- 기록 ----------
export interface AuditLog {
  id: string
  at: string
  actor: string
  listingId?: string
  action: string
  detail?: string
}

export interface AppEvent {
  id: string
  at: string
  type: string
  supplierRole?: SupplierRole
  listingId?: string
}

// ---------- 수요자 공개용 데이터 ----------
export interface PublicPhoto {
  id: string
  category: string
  dataUrl?: string
  caption?: string
  isPrimary: boolean
}

export interface PublicIssue {
  id: string
  area: string
  location: string
  observation: string
  suspectedRepairs: RepairItemKey[]
  repairLikelihood: RepairLikelihood
  burden: BurdenLevel
  sufficiency: PhotoSufficiency
  confidence: ConfidenceLevel
  needsFieldCheck: boolean
  note?: string
}

export interface PublicEstimateItem {
  label: string
  unit: string
  quantity: number
  minCostManwon: number
  maxCostManwon: number
  basis: string
  needsFieldQuote: boolean
}

export interface PublicListing {
  schemaVersion: 1
  id: string
  name: string
  publicAddress: string
  addressPublicLevel: AddressPublicLevel
  houseType: string
  floorAreaM2?: number
  landAreaM2?: number
  builtYear?: number
  rooms?: number
  baths?: number
  floors?: number
  vacantMonths?: number
  livableOpinion: LivableOpinion
  transaction: Omit<TransactionInfo, 'agentName'>
  farm: FarmEnvironment
  living: LivingEnvironment
  photos: PublicPhoto[]
  issues: PublicIssue[]
  uncheckable: string[]
  estimate?: {
    items: PublicEstimateItem[]
    totalMinManwon: number
    totalMaxManwon: number
  }
  fieldCheck: string[]
  isDemoAnalysis: boolean
  disclaimers: string[]
  isDemo: boolean
  publishedAt: string
}

export interface PublicExportPayload {
  schemaVersion: 1
  exportedAt: string
  listings: PublicListing[]
}
