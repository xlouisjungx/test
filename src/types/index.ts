/** 터잡앙 공용 타입 정의 */

export const REGIONS = [
  '애월읍',
  '한림읍',
  '한경면',
  '대정읍',
  '안덕면',
  '남원읍',
  '표선면',
  '성산읍',
  '구좌읍',
  '조천읍',
] as const
export type Region = (typeof REGIONS)[number]

export const CROPS = ['감귤', '밭작물', '시설원예', '특용작물', '아직 미정'] as const
export type Crop = (typeof CROPS)[number]

export const VEHICLES = ['없음', '승용차', '1톤 트럭', '소형 농기계'] as const
export type Vehicle = (typeof VEHICLES)[number]

/** 999 = 상관없음 */
export const TRAVEL_OPTIONS = [10, 20, 30, 999] as const
export type MaxTravel = (typeof TRAVEL_OPTIONS)[number]

/** 사진·현장 정보로 확인된 상태. unknown = 사진만으로 판단 불가 */
export type TriState = 'yes' | 'no' | 'unknown'

export type Level = '낮음' | '보통' | '높음'
export type AccessLevel = '좋음' | '보통' | '아쉬움'

export const UTILITY_KEYS = ['water', 'electricity', 'heating', 'internet', 'transit', 'amenities'] as const
export type UtilityKey = (typeof UTILITY_KEYS)[number]

export const UTILITY_LABELS: Record<UtilityKey, string> = {
  water: '수도',
  electricity: '전기',
  heating: '난방',
  internet: '인터넷',
  transit: '대중교통 접근성',
  amenities: '마트·병원 등 생활시설',
}

export const PRIORITY_OPTIONS = [
  '예산·초기 주거비',
  '농지 접근성',
  '차량·농기계 진입',
  '창고·보관공간',
  '주택 상태·수리 부담',
  '생활 인프라',
] as const

export interface BudgetConditions {
  /** 최대 보증금 (만 원) */
  maxDeposit: number
  /** 허용 가능한 월 임대료 (만 원) */
  maxMonthlyRent: number
  /** 사용 가능한 수리 예산 (만 원) */
  repairBudget: number
  /** 보증금 + 수리비 합산 최대 초기 주거비 (만 원) */
  maxInitialCost: number
}

export interface UserConditions {
  regions: Region[]
  crop: Crop | ''
  farmLocation: string
  maxTravelMinutes: MaxTravel
  budget: BudgetConditions
  vehicles: Vehicle[]
  vehicleAccessRequired: boolean
  parkingRequired: boolean
  storageRequired: boolean
  yardRequired: boolean
  farmStorageRequired: boolean
  requiredUtilities: UtilityKey[]
  /** 가장 중요하게 생각하는 조건 (최대 3개) */
  priorities: string[]
}

export interface PhotoAnalysisItem {
  /** 벽·천장·바닥 등 */
  part: string
  /** 사진에서 관찰된 상태 */
  observation: string
  repairLikelihood: Level | '판단 불가'
  burden: Level | '판단 불가'
  note: string
  /** 사진 충분성 */
  photoConfidence: '충분' | '보통' | '부족'
  needsSiteCheck: boolean
}

export interface RepairItem {
  name: string
  /** 만 원 */
  minCost: number
  /** 만 원 */
  maxCost: number
  basis: string
}

export interface HousePhoto {
  id: string
  label: string
}

export interface House {
  id: string
  name: string
  summary: string
  region: Region
  areaM2: number
  builtYear: number
  dealType: string
  /** 만 원 */
  deposit: number
  /** 만 원 */
  monthlyRent: number
  photos: HousePhoto[]
  farmDistanceKm: number
  farmTravelMinutes: number
  truckAccess: TriState
  truckAccessNote: string
  machineAccess: TriState
  parking: TriState
  parkingNote: string
  hasStorage: boolean
  storageNote: string
  hasYard: boolean
  yardNote: string
  utilities: {
    water: TriState
    electricity: TriState
    heating: TriState
    internet: TriState
  }
  utilityNote: string
  transitAccess: AccessLevel
  amenityAccess: AccessLevel
  repairBurden: Level
  photoAnalysis: PhotoAnalysisItem[]
  repairItems: RepairItem[]
  /** 사진만으로 확인할 수 없는 항목 */
  unknownFromPhotos: string[]
  /** 이 집에서 특히 현장 확인이 필요한 항목 */
  extraSiteChecks: string[]
  /** MVP 시연용 가상 매물 표시 */
  isDemo: true
}

export interface ScoreBreakdownItem {
  key: string
  label: string
  score: number
  max: number
  detail: string
}

export interface InitialCostRange {
  /** 보증금 + 최소 예상 수리비 (만 원) */
  min: number
  /** 보증금 + 최대 예상 수리비 (만 원) */
  max: number
}

export interface HouseScore {
  houseId: string
  total: number
  breakdown: ScoreBreakdownItem[]
  reasons: string[]
  cautions: string[]
  matched: string[]
  mismatched: string[]
  siteCheckNeeded: string[]
  warnings: string[]
  initialCost: InitialCostRange
}

export interface RankedHouse {
  house: House
  score: HouseScore
  rank: number
}

export interface VisitRequestInput {
  houseId: string
  houseName: string
  name: string
  phone: string
  contact: string
  visitDate: string
  timeSlot: string
  companions: number
  questions: string
  agreedPrivacy: boolean
}

export interface VisitRequest extends VisitRequestInput {
  id: string
  createdAt: string
}
