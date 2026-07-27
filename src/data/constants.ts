import type {
  AddressPublicLevel,
  AnalysisStatus,
  BurdenLevel,
  ConfidenceLevel,
  ListingStatus,
  LivableOpinion,
  PhotoCategory,
  PhotoSufficiency,
  RepairItemKey,
  RepairLikelihood,
  SupplierRole,
  TransactionType,
  Tri,
  UtilizationIntent,
  VisitStatus,
} from '../types'

export const REGIONS = [
  '애월읍', '한림읍', '한경면', '대정읍', '안덕면',
  '남원읍', '표선면', '성산읍', '구좌읍', '조천읍', '기타',
] as const

export const HOUSE_TYPES = ['단독주택', '농가주택', '창고 딸린 주택', '다가구주택', '기타'] as const

export const CROPS = ['감귤', '밭작물', '시설원예', '특용작물', '축산', '기타'] as const

export const SUPPLIER_ROLE_META: Record<SupplierRole, { label: string; desc: string }> = {
  owner: {
    label: '빈집 소유자',
    desc: '소유하거나 관리 권한을 가진 빈집을 등록하고, 활용 의사를 표시하며, 방문 신청을 확인합니다.',
  },
  agent: {
    label: '공인중개사',
    desc: '소유자의 활용 동의를 받은 빈집을 등록하고, 거래조건 입력과 AI 분석 검토, 방문 일정 조율을 담당합니다.',
  },
  institution: {
    label: '지자체·귀농지원기관',
    desc: '빈집 활용사업과 연계된 주택을 등록하고, 공공임대 등 공급유형과 여러 빈집의 방문 신청을 관리합니다.',
  },
}

export const LISTING_STATUS_META: Record<ListingStatus, { label: string; cls: string }> = {
  draft: { label: '작성 중', cls: 'bg-sand-100 text-basalt-500' },
  incomplete: { label: '정보 미완료', cls: 'bg-citrus-100 text-citrus-600' },
  analysis_pending: { label: '분석 대기', cls: 'bg-sand-200 text-basalt-700' },
  review_required: { label: '검토 필요', cls: 'bg-citrus-400 text-white' },
  ready_to_publish: { label: '공개 가능', cls: 'bg-leaf-200 text-pine-700' },
  published: { label: '공개 중', cls: 'bg-pine-600 text-white' },
  paused: { label: '일시 비공개', cls: 'bg-basalt-500 text-white' },
  archived: { label: '보관', cls: 'bg-pine-700 text-white' },
}

export const ANALYSIS_STATUS_LABEL: Record<AnalysisStatus, string> = {
  none: '분석 전',
  running: '분석 중',
  done: '분석 완료',
  review_required: '검토 필요',
  reviewed: '검토 완료',
  failed: '분석 실패',
}

export const VISIT_STATUS_META: Record<VisitStatus, { label: string; cls: string }> = {
  received: { label: '신청 접수', cls: 'bg-citrus-100 text-citrus-600' },
  checking: { label: '확인 중', cls: 'bg-sand-200 text-basalt-700' },
  confirmed: { label: '방문 확정', cls: 'bg-pine-600 text-white' },
  reschedule_requested: { label: '일정 변경 요청', cls: 'bg-citrus-400 text-white' },
  rejected: { label: '방문 거절', cls: 'bg-basalt-500 text-white' },
  completed: { label: '방문 완료', cls: 'bg-leaf-200 text-pine-700' },
  cancelled: { label: '신청 취소', cls: 'bg-sand-100 text-basalt-500' },
}

export const REJECT_REASONS = [
  '소유자 일정 조율 필요',
  '출입이 어려운 상태',
  '다른 신청과 일정 중복',
  '매물 정보 재검토 중',
  '거래 또는 공개 중단',
  '기타',
] as const

export const PHOTO_CATEGORY_META: Record<PhotoCategory, { label: string; naAllowed?: boolean }> = {
  front: { label: '건물 정면' },
  side_back: { label: '건물 측면·후면' },
  roof_wall: { label: '지붕과 외벽' },
  entrance: { label: '현관과 진입로' },
  living: { label: '거실 전체' },
  room: { label: '방 내부' },
  ceiling_corner: { label: '천장과 벽 모서리' },
  floor: { label: '바닥' },
  window: { label: '창문과 창틀' },
  kitchen: { label: '주방' },
  bathroom: { label: '화장실' },
  utility: { label: '전기·수도·난방설비' },
  storage: { label: '창고', naAllowed: true },
  yard_parking: { label: '마당과 주차공간', naAllowed: true },
}

export const REQUIRED_PHOTO_CATEGORIES = Object.keys(PHOTO_CATEGORY_META) as PhotoCategory[]

export const TRI_LABEL: Record<Tri, string> = { yes: '있음/예', no: '없음/아니오', unknown: '확인되지 않음' }

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  monthly: '월세',
  jeonse: '전세',
  sale: '매매',
  public_rent: '공공임대',
  negotiable: '협의',
}

export const INTENT_LABEL: Record<UtilizationIntent, string> = {
  rent: '임대',
  sale: '매매',
  public_program: '공공사업 연계',
  negotiable: '협의 필요',
}

export const ADDRESS_LEVEL_LABEL: Record<AddressPublicLevel, string> = {
  town: '읍·면까지만 공개',
  ri: '리 단위까지 공개',
  after_visit: '방문 확정 후 공개',
}

export const LIVABLE_LABEL: Record<LivableOpinion, string> = {
  ready: '바로 거주 가능',
  minor_repair: '소규모 수리 후 가능',
  major_repair: '상당한 수리 필요',
  unknown: '판단 불가',
}

export const BURDEN_META: Record<BurdenLevel, { label: string; cls: string }> = {
  low: { label: '낮음', cls: 'bg-leaf-200 text-pine-700' },
  medium: { label: '보통', cls: 'bg-citrus-100 text-citrus-600' },
  high: { label: '높음', cls: 'bg-citrus-500 text-white' },
}

export const SUFFICIENCY_LABEL: Record<PhotoSufficiency, string> = {
  sufficient: '충분',
  partial: '부분 확인',
  insufficient: '판단 불가',
}

export const LIKELIHOOD_LABEL: Record<RepairLikelihood, string> = {
  likely: '수리 필요 가능성 높음',
  possible: '수리 가능성 있음',
  unknown: '판단 불가',
}

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
}

export const REPAIR_ITEM_LABEL: Record<RepairItemKey, string> = {
  wallpaper_paint: '도배·도장',
  flooring: '바닥재 교체',
  window: '창호 보수·교체',
  bathroom: '화장실 보수',
  kitchen: '주방 보수',
  waterproof: '방수',
  exterior_wall: '외벽 보수',
  demolition: '부분 철거·폐기물 처리',
  structure: '구조보강',
  asbestos: '석면 등 유해물질 처리',
  plumbing: '배관 전체 공사',
  electric: '전기 전체 공사',
}

/** 기본 현장 확인 항목 */
export const DEFAULT_FIELD_CHECK_ITEMS = [
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
] as const

export const ESTIMATE_DISCLAIMER =
  '예상 수리비는 사진에서 확인된 항목과 사전 단가표를 이용해 계산한 참고 범위입니다. 실제 공사범위와 견적은 전문가의 현장점검에 따라 달라질 수 있습니다.'

export const SAFETY_NOTICE =
  '이 정보는 사진과 공급자가 제출한 자료를 바탕으로 정리한 참고 자료입니다. 구조 안전, 권리관계, 설비 상태는 방문과 전문가 현장점검을 통해 반드시 직접 확인하세요.'

export const DEMO_BADGE = 'MVP 시연용 가상 정보'

export const STORAGE_KEYS = {
  listings: 'teojabang:listings:v1',
  visits: 'teojabang:visits:v1',
  session: 'teojabang:supplier-session:v1',
  audit: 'teojabang:audit-logs:v1',
  events: 'teojabang:events:v1',
  importedPublic: 'teojabang:imported-public:v1',
} as const
