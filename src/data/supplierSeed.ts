import type { Region, TriState } from '../types'
import type {
  AnalysisReview,
  HouseListing,
  PhotoAnalysisResult,
  PhotoCategory,
  ReviewedIssue,
  SupplierPhoto,
  SupplierVisit,
} from '../types/supplier'
import { PHOTO_CATEGORIES } from '../types/supplier'
import { buildEstimateFromIssues } from '../services/repair-cost'

/** 공급자 데모 데이터 — 모두 MVP 시연용 가상 정보 */

export const DEFAULT_FIELD_CHECKS = [
  '벽체와 기초의 구조적 안전성',
  '지붕 내부와 숨은 누수',
  '전기배선 내부 상태',
  '수도배관 내부 상태',
  '보일러 작동 상태',
  '난방설비 작동 상태',
  '석면 등 유해물질 존재 여부',
  '토지·건축물 권리관계',
  '불법 증축 여부',
  '정화조와 배수 상태',
  '실제 차량 진입 가능 폭',
  '우천 시 침수·배수 상태',
  '마을 진입로',
  '통신 상태',
  '주변 소음과 냄새',
]

export const defaultFieldChecks = () =>
  DEFAULT_FIELD_CHECKS.map((label, i) => ({ id: `fc-${i}`, label, source: 'default' as const, note: '' }))

const demoPhotos = (listingId: string, categories: readonly PhotoCategory[]): SupplierPhoto[] =>
  categories.map((category, i) => ({
    id: `${listingId}-photo-${i}`,
    category,
    fileName: `demo-${listingId}-${i + 1}.jpg`,
    fileSize: 1_800_000,
    description: `${category} (시연용 데모 이미지)`,
    takenAt: '2026-07-01',
    isPrimary: i === 0,
    isPublic: true,
    isDemoImage: true,
  }))

type IssueSeed = Omit<ReviewedIssue, 'id' | 'excluded' | 'editReason'>

const issues = (listingId: string, seeds: IssueSeed[]): ReviewedIssue[] =>
  seeds.map((s, i) => ({ ...s, id: `${listingId}-issue-${i}`, excluded: false, editReason: '' }))

function analysisOf(listingId: string, list: ReviewedIssue[], unknowns: string[]): PhotoAnalysisResult {
  return {
    listingId,
    provider: 'mock',
    isDemo: true,
    analyzedAt: '2026-07-20T09:00:00.000Z',
    issues: list.map(({ excluded: _e, editReason: _r, ...rest }) => rest),
    unknowns,
  }
}

function doneReview(ai: PhotoAnalysisResult, finalIssues: ReviewedIssue[], reviewedBy: string): AnalysisReview {
  return {
    aiOriginal: ai,
    finalIssues,
    reviewedBy,
    reviewedAt: '2026-07-21T10:00:00.000Z',
    reason: '사진과 대조해 부담 등급을 확인했습니다. (시연용)',
    status: 'done',
  }
}

interface SeedSpec {
  id: string
  name: string
  region: Region
  status: HouseListing['status']
  supplierType: HouseListing['supplierType']
  floorAreaM2: number
  landAreaM2: number
  builtYear: number
  deposit: number
  monthlyRent: number
  photoCategories: readonly PhotoCategory[]
  photoNA: PhotoCategory[]
  farm: Partial<HouseListing['farm']>
  living: Partial<HouseListing['living']>
  issueSeeds: IssueSeed[]
  unknowns: string[]
  reviewed: boolean
  summary: string
}

const baseFarm: HouseListing['farm'] = {
  nearbyCrops: [],
  farmDistanceKm: 0,
  farmTravelMinutes: 0,
  farmLinkAvailable: 'unknown',
  truckAccess: 'unknown',
  machineAccess: 'unknown',
  roadWidthM: 0,
  turnaround: 'unknown',
  parkingCount: 0,
  hasStorage: false,
  storageAreaM2: 0,
  farmStorage: 'unknown',
  hasYard: false,
  yardAreaM2: 0,
  outdoorWater: 'unknown',
  workspace: 'unknown',
  note: '',
}

const baseLiving: HouseListing['living'] = {
  water: 'unknown',
  groundwater: 'unknown',
  electricity: 'unknown',
  heatingType: '',
  boilerChecked: 'unknown',
  internetAvailable: 'unknown',
  septic: 'unknown',
  wasteDisposal: '',
  busStopM: 0,
  martKm: 0,
  hospitalKm: 0,
  townCenterKm: 0,
  neighborM: 0,
  mobileSignal: '확인되지 않음',
  note: '',
}

function buildListing(spec: SeedSpec): HouseListing {
  const final = issues(spec.id, spec.issueSeeds)
  const analysis = spec.issueSeeds.length > 0 ? analysisOf(spec.id, final, spec.unknowns) : null
  const estimate = spec.reviewed
    ? { ...buildEstimateFromIssues(final), reviewed: true, reviewedAt: '2026-07-21T10:00:00.000Z' }
    : analysis
      ? buildEstimateFromIssues(final)
      : null

  return {
    id: spec.id,
    version: 1,
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-21T10:00:00.000Z',
    status: spec.status,
    supplierType: spec.supplierType,
    consent: {
      isOwnerSelf: spec.supplierType === '빈집 소유자',
      ownerName: '데모 소유자 (가상)',
      ownerContact: '000-0000-0000',
      utilizationIntent: '임대',
      consentConfirmed: true,
      consentDate: '2026-07-10',
      consentEvidenceName: 'demo-consent.pdf',
      registrantName: '데모 담당자 (가상)',
      registrantOrg: spec.supplierType === '공인중개사' ? '데모부동산 (가상)' : '데모기관 (가상)',
      registrantContact: '000-0000-0000',
    },
    basic: {
      name: spec.name,
      region: spec.region,
      fullAddress: `제주 ${spec.region} ○○리 00-0 (시연용 가상 주소)`,
      addressDisclosure: '읍·면까지만 공개',
      houseType: '농가주택',
      floorAreaM2: spec.floorAreaM2,
      landAreaM2: spec.landAreaM2,
      builtYear: spec.builtYear,
      rooms: 3,
      baths: 1,
      floors: 1,
      vacancyMonths: 18,
      gradeInfo: '기존 빈집 실태조사 2등급 (시연용)',
      buildingRegisterChecked: true,
      accessible: 'yes',
      habitability: '소규모 수리 후 가능',
    },
    transaction: {
      dealType: '월세',
      deposit: spec.deposit,
      monthlyRent: spec.monthlyRent,
      salePrice: 0,
      maintenanceFee: 0,
      minContractMonths: 24,
      moveInDate: '2026-10-01',
      priceNegotiable: true,
      publicProgramLinked: spec.supplierType === '지자체·귀농지원기관',
      extraTerms: '',
      agentName: '',
    },
    farm: { ...baseFarm, ...spec.farm, note: spec.summary },
    living: { ...baseLiving, ...spec.living },
    photos: demoPhotos(spec.id, spec.photoCategories),
    photoNA: spec.photoNA,
    analysis,
    review: analysis && spec.reviewed ? doneReview(analysis, final, spec.supplierType) : null,
    estimate,
    fieldChecks: defaultFieldChecks(),
    internalMemo: '시연용 내부 메모 — 수요자에게 공개되지 않습니다.',
    isDemo: true,
  }
}

const tri = (v: TriState) => v

export const SEED_LISTINGS: HouseListing[] = [
  // 1) 공개 중 — 애월 귤밭 돌담집
  buildListing({
    id: 'aewol-stonewall',
    name: '애월 귤밭 돌담집',
    region: '애월읍',
    status: 'published',
    supplierType: '빈집 소유자',
    floorAreaM2: 82,
    landAreaM2: 320,
    builtYear: 1988,
    deposit: 2000,
    monthlyRent: 45,
    photoCategories: PHOTO_CATEGORIES,
    photoNA: [],
    farm: {
      nearbyCrops: ['감귤'],
      farmDistanceKm: 2.1,
      farmTravelMinutes: 7,
      truckAccess: tri('yes'),
      machineAccess: tri('yes'),
      roadWidthM: 4,
      turnaround: 'yes',
      parkingCount: 1,
      hasStorage: true,
      storageAreaM2: 10,
      farmStorage: 'yes',
      hasYard: true,
      yardAreaM2: 60,
      outdoorWater: 'yes',
    },
    living: {
      water: 'yes',
      electricity: 'yes',
      heatingType: '기름보일러',
      boilerChecked: 'unknown',
      internetAvailable: 'yes',
      septic: 'yes',
      busStopM: 700,
      martKm: 4,
      hospitalKm: 6,
      townCenterKm: 5,
      neighborM: 40,
      mobileSignal: '좋음',
    },
    issueSeeds: [
      { part: '벽', photoCategory: '천장·벽 모서리', location: '안방 모서리', feature: '곰팡이 또는 누수 흔적으로 의심되는 변색', suspectedRepair: '도배·도장', likelihood: '보통', burden: '보통', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '결로·누수 원인 확인이 필요합니다.' },
      { part: '창호', photoCategory: '창문·창틀', location: '거실·안방 창', feature: '노후 알루미늄 새시', suspectedRepair: '창호 보수·교체', likelihood: '높음', burden: '보통', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '교체 범위는 현장 확인 후 결정하세요.' },
      { part: '화장실', photoCategory: '화장실', location: '욕실', feature: '타일·위생기구 노후', suspectedRepair: '화장실 보수', likelihood: '보통', burden: '보통', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '부분 보수 가능 여부 확인 필요.' },
      { part: '지붕 외관', photoCategory: '지붕·외벽', location: '지붕', feature: '근접 사진 없음', suspectedRepair: '지붕 보수', likelihood: '판단 불가', burden: '판단 불가', photoSufficiency: '판단 불가', confidence: '낮음', needsSiteCheck: true, note: '사진만으로 판단할 수 없습니다.' },
    ],
    unknowns: ['내부 배관 상태', '보일러 작동 여부', '지붕 내부 구조', '전기 배선 상태'],
    reviewed: true,
    summary: '감귤 농가에 적합한 돌담 안 농가주택. 농지가 가깝고 마당과 소형 창고가 있어요.',
  }),
  // 2) 분석 검토 필요 — 한림 창고형 농가주택
  buildListing({
    id: 'hallim-warehouse',
    name: '한림 창고형 농가주택',
    region: '한림읍',
    status: 'review_required',
    supplierType: '공인중개사',
    floorAreaM2: 96,
    landAreaM2: 500,
    builtYear: 1979,
    deposit: 1000,
    monthlyRent: 30,
    photoCategories: PHOTO_CATEGORIES,
    photoNA: [],
    farm: {
      nearbyCrops: ['밭작물'],
      farmDistanceKm: 1.4,
      farmTravelMinutes: 5,
      truckAccess: tri('yes'),
      machineAccess: tri('yes'),
      roadWidthM: 5,
      turnaround: 'yes',
      parkingCount: 2,
      hasStorage: true,
      storageAreaM2: 40,
      farmStorage: 'yes',
      hasYard: true,
      yardAreaM2: 150,
      outdoorWater: 'yes',
    },
    living: {
      water: 'yes',
      electricity: 'unknown',
      heatingType: '기름보일러 (교체 필요로 보임)',
      boilerChecked: 'no',
      internetAvailable: 'unknown',
      septic: 'unknown',
      busStopM: 1800,
      martKm: 9,
      hospitalKm: 11,
      townCenterKm: 8,
      neighborM: 120,
      mobileSignal: '보통',
    },
    issueSeeds: [
      { part: '벽', photoCategory: '방 내부', location: '방 전체', feature: '벽지 들뜸·오염', suspectedRepair: '도배·도장', likelihood: '높음', burden: '보통', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '벽체 균열 여부 현장 확인 필요.' },
      { part: '천장', photoCategory: '천장·벽 모서리', location: '주방 천장', feature: '처짐과 얼룩 — 누수 이력 의심', suspectedRepair: '방수', likelihood: '높음', burden: '높음', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '누수 여부를 현장에서 확인해야 합니다.' },
      { part: '바닥', photoCategory: '바닥', location: '거실·방', feature: '장판 노후, 꺼짐 의심', suspectedRepair: '바닥재 교체', likelihood: '높음', burden: '보통', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '하부 상태는 판단할 수 없습니다.' },
      { part: '창호', photoCategory: '창문·창틀', location: '전체', feature: '단창 혼합 새시 노후', suspectedRepair: '창호 보수·교체', likelihood: '높음', burden: '높음', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: false, note: '이중창 교체 고려.' },
      { part: '화장실', photoCategory: '화장실', location: '욕실', feature: '재래식에 가까운 구조', suspectedRepair: '화장실 보수', likelihood: '높음', burden: '높음', photoSufficiency: '충분', confidence: '높음', needsSiteCheck: true, note: '배관 위치에 따라 비용 차이가 큽니다.' },
      { part: '지붕 외관', photoCategory: '지붕·외벽', location: '지붕', feature: '슬레이트 지붕으로 보임', suspectedRepair: '지붕 보수', likelihood: '판단 불가', burden: '판단 불가', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '석면 여부는 전문가 조사가 필요합니다.' },
      { part: '설비', photoCategory: '전기·수도·난방설비', location: '보일러실', feature: '보일러 노후·부식 의심', suspectedRepair: '보일러·난방 교체', likelihood: '높음', burden: '보통', photoSufficiency: '부분 확인', confidence: '보통', needsSiteCheck: true, note: '작동 여부 현장 확인 필요.' },
    ],
    unknowns: ['지붕 석면 포함 여부', '전기 승압 필요 여부', '수도·배수 배관 상태', '바닥 하부 상태'],
    reviewed: false,
    summary: '밭작물 농가에 적합한 넓은 창고 딸린 농가주택. 내부 수리 부담은 높은 편이에요.',
  }),
  // 3) 사진 미완료 — 성산 바람담은 집
  buildListing({
    id: 'seongsan-wind',
    name: '성산 바람담은 집',
    region: '성산읍',
    status: 'incomplete',
    supplierType: '지자체·귀농지원기관',
    floorAreaM2: 66,
    landAreaM2: 180,
    builtYear: 2001,
    deposit: 3000,
    monthlyRent: 50,
    photoCategories: ['건물 정면', '거실 전체', '주방', '현관·진입로', '방 내부', '화장실'],
    photoNA: ['창고'],
    farm: {
      nearbyCrops: ['감귤', '밭작물'],
      farmDistanceKm: 6.2,
      farmTravelMinutes: 15,
      truckAccess: tri('no'),
      machineAccess: tri('yes'),
      roadWidthM: 2.4,
      turnaround: 'no',
      parkingCount: 1,
      hasStorage: false,
      storageAreaM2: 0,
      farmStorage: 'no',
      hasYard: true,
      yardAreaM2: 25,
      outdoorWater: 'yes',
    },
    living: {
      water: 'yes',
      electricity: 'yes',
      heatingType: '기름보일러',
      boilerChecked: 'yes',
      internetAvailable: 'yes',
      septic: 'yes',
      busStopM: 300,
      martKm: 1.5,
      hospitalKm: 2.5,
      townCenterKm: 2,
      neighborM: 15,
      mobileSignal: '좋음',
    },
    issueSeeds: [],
    unknowns: [],
    reviewed: false,
    summary: '생활시설 접근성이 좋고 수리 부담이 비교적 낮은 집. 창고가 없고 트럭 진입이 어려워요.',
  }),
]

export const SEED_VISITS: SupplierVisit[] = [
  {
    id: 'TJ-20260725-DEMO1',
    houseId: 'aewol-stonewall',
    houseName: '애월 귤밭 돌담집',
    name: '김예비 (가상)',
    phone: '010-0000-0001',
    contact: 'demo1@example.com',
    visitDate: '2026-08-05',
    timeSlot: '오전 (9~12시)',
    companions: 1,
    questions: '지붕 누수 흔적과 창고 상태를 확인하고 싶어요.',
    createdAt: '2026-07-25T09:00:00.000Z',
    status: '신청 접수',
    supplierMemo: '',
    confirmedDate: '',
    proposedDate: '',
    rejectReason: '',
    updatedAt: '2026-07-25T09:00:00.000Z',
    isDemo: true,
  },
  {
    id: 'TJ-20260723-DEMO2',
    houseId: 'aewol-stonewall',
    houseName: '애월 귤밭 돌담집',
    name: '이귀농 (가상)',
    phone: '010-0000-0002',
    contact: '',
    visitDate: '2026-08-02',
    timeSlot: '오후 (12~17시)',
    companions: 2,
    questions: '1톤 트럭 회차 공간을 직접 확인하고 싶습니다.',
    createdAt: '2026-07-23T14:00:00.000Z',
    status: '방문 확정',
    supplierMemo: '소유자 동행 예정 (시연용 메모)',
    confirmedDate: '2026-08-02',
    proposedDate: '',
    rejectReason: '',
    updatedAt: '2026-07-24T10:00:00.000Z',
    isDemo: true,
  },
  {
    id: 'TJ-20260722-DEMO3',
    houseId: 'hallim-warehouse',
    houseName: '한림 창고형 농가주택',
    name: '박정착 (가상)',
    phone: '010-0000-0003',
    contact: 'demo3@example.com',
    visitDate: '2026-07-30',
    timeSlot: '저녁 (17시 이후)',
    companions: 0,
    questions: '보일러와 전기 상태가 궁금합니다.',
    createdAt: '2026-07-22T11:00:00.000Z',
    status: '일정 변경 요청',
    supplierMemo: '',
    confirmedDate: '',
    proposedDate: '2026-08-08',
    rejectReason: '',
    updatedAt: '2026-07-23T09:00:00.000Z',
    isDemo: true,
  },
]
