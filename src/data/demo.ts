import type {
  HouseListing,
  HousePhoto,
  PhotoCategory,
  VisibleIssue,
  VisitRequest,
} from '../types'
import { DEFAULT_FIELD_CHECK_ITEMS, PHOTO_CATEGORY_META, REQUIRED_PHOTO_CATEGORIES } from './constants'
import { buildEstimate } from '../services/repair-cost'

// 모든 데모 데이터는 MVP 시연용 가상 정보다. 실제 주소·소유자·연락처가 아니다.

function demoImage(label: string, bg: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480'><rect width='100%' height='100%' fill='${bg}'/><text x='50%' y='46%' fill='#ffffff' font-size='34' font-family='sans-serif' text-anchor='middle'>${label}</text><text x='50%' y='58%' fill='#ffffffcc' font-size='20' font-family='sans-serif' text-anchor='middle'>MVP 시연용 가상 사진</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function demoPhotos(prefix: string, categories: PhotoCategory[], bg: string): HousePhoto[] {
  return categories.map((category, idx) => ({
    id: `${prefix}-photo-${category}`,
    category,
    fileName: `${prefix}-${category}.jpg`,
    dataUrl: demoImage(PHOTO_CATEGORY_META[category].label, bg),
    caption: `${PHOTO_CATEGORY_META[category].label} (시연용 가상 사진)`,
    takenAt: '2026-07-10',
    isPrimary: idx === 0,
    isPublic: true,
    order: idx,
  }))
}

function defaultFieldChecks(prefix: string) {
  return DEFAULT_FIELD_CHECK_ITEMS.map((label, i) => ({ id: `${prefix}-fc-${i}`, label, custom: false }))
}

function baseListing(id: string, createdAt: string): HouseListing {
  return {
    id,
    schemaVersion: 1,
    createdAt,
    updatedAt: createdAt,
    supplierRole: 'owner',
    status: 'draft',
    isDemo: true,
    consent: {
      isOwnerSelf: true,
      ownerName: '홍길동(가상)',
      ownerContact: '010-0000-0000(가상)',
      intent: 'rent',
      consentConfirmed: true,
      consentDate: '2026-07-01',
      managerName: '홍길동(가상)',
    },
    basic: {
      name: '',
      region: '애월읍',
      addressPublicLevel: 'town',
      houseType: '농가주택',
      buildingRegisterChecked: 'unknown',
      accessible: 'yes',
      livableOpinion: 'minor_repair',
    },
    transaction: { type: 'monthly', priceNegotiable: true, publicProgramLinked: false },
    farm: {
      crops: ['감귤'],
      farmlandLinkage: 'unknown',
      truckAccess: 'yes',
      machineAccess: 'yes',
      turnaround: 'unknown',
      hasStorage: 'no',
      storageUsable: 'unknown',
      hasYard: 'yes',
      outdoorWater: 'unknown',
      workspace: 'unknown',
    },
    living: {
      waterSupply: 'yes',
      groundwater: 'unknown',
      electricity: 'yes',
      heating: '기름보일러',
      boilerChecked: 'unknown',
      internetAvailable: 'unknown',
      sewage: '정화조',
      mobileSignal: 'good',
    },
    photos: [],
    photoNA: [],
    analysisStatus: 'none',
    fieldCheckItems: defaultFieldChecks(id),
    publishConfirmations: { privacyChecked: false, safetyNoticeChecked: false, fieldCheckChecked: false },
  }
}

// ---------- 1. 애월 귤밭 돌담집 (공개 중) ----------
const aewolIssues: VisibleIssue[] = [
  {
    id: 'demo-1-issue-1',
    photoIds: ['demo-1-photo-ceiling_corner'],
    area: '천장',
    location: '안방 천장 모서리',
    observation: '천장 모서리 변색이 관찰되어 누수 여부를 현장에서 확인해야 합니다.',
    suspectedRepairs: ['waterproof', 'wallpaper_paint'],
    repairLikelihood: 'possible',
    burden: 'medium',
    sufficiency: 'partial',
    confidence: 'medium',
    needsFieldCheck: true,
    note: '변색 원인(누수·결로)은 사진만으로 구분할 수 없습니다.',
  },
  {
    id: 'demo-1-issue-2',
    photoIds: ['demo-1-photo-floor'],
    area: '바닥',
    location: '거실 바닥',
    observation: '장판 들뜸과 마모가 관찰됩니다.',
    suspectedRepairs: ['flooring'],
    repairLikelihood: 'likely',
    burden: 'medium',
    sufficiency: 'sufficient',
    confidence: 'medium',
    needsFieldCheck: false,
  },
  {
    id: 'demo-1-issue-3',
    photoIds: ['demo-1-photo-utility'],
    area: '설비',
    location: '보일러 배관 주변',
    observation: '배관 연결부 주변에 녹·부식 흔적이 관찰됩니다.',
    suspectedRepairs: [],
    repairLikelihood: 'unknown',
    burden: 'medium',
    sufficiency: 'insufficient',
    confidence: 'low',
    needsFieldCheck: true,
    note: '사진만으로 내부 배관 상태를 판단할 수 없습니다.',
  },
]

function makeAewol(): HouseListing {
  const l = baseListing('demo-1', '2026-07-05T09:00:00.000Z')
  l.updatedAt = '2026-07-12T09:00:00.000Z'
  l.supplierRole = 'owner'
  l.basic = {
    ...l.basic,
    name: '애월 귤밭 돌담집',
    region: '애월읍',
    ri: '소길리(가상)',
    addressDetail: '제주시 애월읍 소길리 000-0 (가상 주소)',
    addressPublicLevel: 'ri',
    houseType: '농가주택',
    floorAreaM2: 72,
    landAreaM2: 320,
    builtYear: 1988,
    rooms: 3,
    baths: 1,
    floors: 1,
    vacantMonths: 18,
    gradeInfo: '2025년 빈집 실태조사 2등급(가상)',
    buildingRegisterChecked: 'yes',
    livableOpinion: 'minor_repair',
  }
  l.transaction = {
    type: 'monthly',
    depositManwon: 500,
    monthlyRentManwon: 35,
    maintenanceFeeManwon: 0,
    minContractMonths: 24,
    moveInDate: '2026-09-01',
    priceNegotiable: true,
    publicProgramLinked: false,
    extraTerms: '마당 귤나무 관리 조건 협의 가능(가상)',
  }
  l.farm = {
    ...l.farm,
    crops: ['감귤'],
    farmDistanceKm: 0.4,
    farmDriveMinutes: 2,
    farmlandLinkage: 'yes',
    roadWidthM: 4,
    turnaround: 'yes',
    parkingCount: 2,
    hasStorage: 'yes',
    storageAreaM2: 20,
    storageUsable: 'yes',
    yardAreaM2: 90,
    outdoorWater: 'yes',
    workspace: 'yes',
    note: '돌담으로 둘러싸인 마당이 있어 소형 농기구 보관에 적합합니다. (가상)',
  }
  l.living = {
    ...l.living,
    busStopDistanceM: 350,
    martDistanceKm: 1.2,
    hospitalDistanceKm: 3.5,
    townCenterDistanceKm: 2.8,
    neighborDistanceM: 30,
    internetAvailable: 'yes',
  }
  l.photos = demoPhotos('demo-1', REQUIRED_PHOTO_CATEGORIES, '#2e7050')
  l.analysisStatus = 'reviewed'
  l.aiResult = {
    id: 'demo-1-analysis',
    provider: 'mock',
    isDemo: true,
    analyzedAt: '2026-07-11T10:00:00.000Z',
    issues: aewolIssues,
    uncheckable: ['내부 배관 상태', '전기배선 내부 상태', '지붕 내부 구조와 숨은 누수', '단열 상태'],
  }
  l.finalIssues = aewolIssues.map((i) => ({ ...i }))
  l.review = { reviewedBy: '빈집 소유자(데모)', reviewedAt: '2026-07-11T11:00:00.000Z', reason: '사진과 대조하여 이상 없음 확인' }
  l.estimate = { ...buildEstimate(l, l.finalIssues), reviewed: true, reviewedAt: '2026-07-11T11:05:00.000Z' }
  l.publishConfirmations = { privacyChecked: true, safetyNoticeChecked: true, fieldCheckChecked: true }
  l.status = 'published'
  l.publishedAt = '2026-07-12T09:00:00.000Z'
  return l
}

// ---------- 2. 한림 창고형 농가주택 (분석 검토 필요) ----------
const hallimIssues: VisibleIssue[] = [
  {
    id: 'demo-2-issue-1',
    photoIds: ['demo-2-photo-roof_wall'],
    area: '외벽',
    location: '창고 쪽 외벽',
    observation: '외벽 표면 균열로 보이는 선형 흔적이 관찰되어 현장 확인이 필요합니다.',
    suspectedRepairs: ['exterior_wall'],
    repairLikelihood: 'possible',
    burden: 'high',
    sufficiency: 'partial',
    confidence: 'medium',
    needsFieldCheck: true,
    note: '구조적 영향 여부는 사진으로 판정할 수 없습니다.',
  },
  {
    id: 'demo-2-issue-2',
    photoIds: ['demo-2-photo-bathroom'],
    area: '화장실',
    location: '화장실 내부',
    observation: '타일 줄눈 오염과 마감 노후가 관찰됩니다.',
    suspectedRepairs: ['bathroom'],
    repairLikelihood: 'likely',
    burden: 'high',
    sufficiency: 'sufficient',
    confidence: 'medium',
    needsFieldCheck: true,
  },
  {
    id: 'demo-2-issue-3',
    photoIds: ['demo-2-photo-living'],
    area: '벽',
    location: '거실 벽면',
    observation: '벽지 오염과 곰팡이로 의심되는 변색이 관찰됩니다.',
    suspectedRepairs: ['wallpaper_paint'],
    repairLikelihood: 'likely',
    burden: 'low',
    sufficiency: 'sufficient',
    confidence: 'high',
    needsFieldCheck: false,
  },
]

function makeHallim(): HouseListing {
  const l = baseListing('demo-2', '2026-07-08T09:00:00.000Z')
  l.updatedAt = '2026-07-14T09:00:00.000Z'
  l.supplierRole = 'agent'
  l.consent = {
    isOwnerSelf: false,
    ownerName: '김제주(가상)',
    ownerContact: '010-1111-1111(가상)',
    intent: 'sale',
    consentConfirmed: true,
    consentDate: '2026-07-07',
    evidenceFileName: '활용동의서_한림(가상).pdf',
    managerName: '박중개(가상)',
    managerOrg: '한림부동산(가상)',
    managerContact: '010-2222-2222(가상)',
  }
  l.basic = {
    ...l.basic,
    name: '한림 창고형 농가주택',
    region: '한림읍',
    addressDetail: '제주시 한림읍 000-0 (가상 주소)',
    addressPublicLevel: 'town',
    houseType: '창고 딸린 주택',
    floorAreaM2: 95,
    landAreaM2: 450,
    builtYear: 1995,
    rooms: 2,
    baths: 1,
    floors: 1,
    vacantMonths: 30,
    buildingRegisterChecked: 'yes',
    livableOpinion: 'major_repair',
  }
  l.transaction = {
    type: 'sale',
    salePriceManwon: 21000,
    priceNegotiable: true,
    publicProgramLinked: false,
    agentName: '박중개(가상)',
  }
  l.farm = {
    ...l.farm,
    crops: ['밭작물', '시설원예'],
    farmDistanceKm: 1.1,
    farmDriveMinutes: 4,
    truckAccess: 'yes',
    machineAccess: 'yes',
    roadWidthM: 5,
    turnaround: 'yes',
    parkingCount: 3,
    hasStorage: 'yes',
    storageAreaM2: 60,
    storageUsable: 'yes',
    hasYard: 'yes',
    yardAreaM2: 150,
    outdoorWater: 'yes',
    workspace: 'yes',
    note: '대형 창고가 있어 농기계 보관에 유리합니다. (가상)',
  }
  l.photos = demoPhotos('demo-2', REQUIRED_PHOTO_CATEGORIES, '#8a6d3b')
  l.analysisStatus = 'review_required'
  l.aiResult = {
    id: 'demo-2-analysis',
    provider: 'mock',
    isDemo: true,
    analyzedAt: '2026-07-14T09:00:00.000Z',
    issues: hallimIssues,
    uncheckable: ['내부 배관 상태', '전기배선 내부 상태', '지붕 내부 구조와 숨은 누수'],
  }
  l.status = 'review_required'
  return l
}

// ---------- 3. 성산 바람담은 집 (촬영 가이드 일부만 충족 · 분석 대기) ----------
function makeSeongsan(): HouseListing {
  const l = baseListing('demo-3', '2026-07-15T09:00:00.000Z')
  l.updatedAt = '2026-07-16T09:00:00.000Z'
  l.supplierRole = 'institution'
  l.consent = {
    isOwnerSelf: false,
    ownerName: '이바람(가상)',
    ownerContact: '010-3333-3333(가상)',
    intent: 'public_program',
    consentConfirmed: true,
    consentDate: '2026-07-14',
    evidenceFileName: '빈집활용사업_동의서_성산(가상).pdf',
    managerName: '최담당(가상)',
    managerOrg: '서귀포시 귀농지원센터(가상)',
    managerContact: '064-000-0000(가상)',
  }
  l.basic = {
    ...l.basic,
    name: '성산 바람담은 집',
    region: '성산읍',
    addressDetail: '서귀포시 성산읍 000-0 (가상 주소)',
    addressPublicLevel: 'after_visit',
    houseType: '단독주택',
    floorAreaM2: 60,
    landAreaM2: 210,
    builtYear: 1992,
    rooms: 2,
    baths: 1,
    floors: 1,
    vacantMonths: 12,
    livableOpinion: 'unknown',
  }
  l.transaction = { type: 'public_rent', depositManwon: 300, monthlyRentManwon: 15, priceNegotiable: false, publicProgramLinked: true }
  l.farm = { ...l.farm, crops: ['밭작물'], farmDistanceKm: 0.8, truckAccess: 'unknown', hasStorage: 'no', hasYard: 'yes', yardAreaM2: 60 }
  l.photos = demoPhotos('demo-3', ['front', 'side_back', 'living', 'kitchen', 'bathroom'], '#3a6ea5')
  l.photoNA = ['storage']
  l.status = 'analysis_pending'
  return l
}

export function makeDemoListings(): HouseListing[] {
  return [makeAewol(), makeHallim(), makeSeongsan()]
}

export function makeDemoVisits(): VisitRequest[] {
  return [
    {
      id: 'demo-visit-1',
      no: 'V-2026-001',
      listingId: 'demo-1',
      applicantName: '청년농 지원자 A(가상)',
      applicantContact: '010-4444-4444(가상)',
      requestedAt: '2026-07-24T02:00:00.000Z',
      preferredDate: '2026-08-03',
      preferredTime: '오전 10시',
      companions: 1,
      questions: '창고 실제 크기와 트럭 진입 가능 여부를 확인하고 싶습니다.',
      status: 'received',
      history: [{ at: '2026-07-24T02:00:00.000Z', status: 'received' }],
      isDemo: true,
    },
    {
      id: 'demo-visit-2',
      no: 'V-2026-002',
      listingId: 'demo-1',
      applicantName: '청년농 지원자 B(가상)',
      applicantContact: '010-5555-5555(가상)',
      requestedAt: '2026-07-20T05:00:00.000Z',
      preferredDate: '2026-07-30',
      preferredTime: '오후 2시',
      companions: 2,
      questions: '보일러와 수도 상태를 직접 확인하고 싶습니다.',
      status: 'confirmed',
      confirmedDate: '2026-07-30',
      confirmedTime: '오후 2시',
      history: [
        { at: '2026-07-20T05:00:00.000Z', status: 'received' },
        { at: '2026-07-21T01:00:00.000Z', status: 'confirmed', note: '소유자 일정 확인 완료' },
      ],
      isDemo: true,
    },
    {
      id: 'demo-visit-3',
      no: 'V-2026-003',
      listingId: 'demo-2',
      applicantName: '청년농 지원자 C(가상)',
      applicantContact: '010-6666-6666(가상)',
      requestedAt: '2026-07-22T08:00:00.000Z',
      preferredDate: '2026-07-29',
      preferredTime: '오전 11시',
      companions: 0,
      questions: '외벽 균열 부위와 창고 내부를 보고 싶습니다.',
      status: 'reschedule_requested',
      proposedDate: '2026-08-01',
      proposedTime: '오전 10시',
      history: [
        { at: '2026-07-22T08:00:00.000Z', status: 'received' },
        { at: '2026-07-23T03:00:00.000Z', status: 'reschedule_requested', note: '소유자 일정으로 8/1 오전 제안' },
      ],
      isDemo: true,
    },
  ]
}
