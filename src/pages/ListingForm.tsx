import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Save, Sparkles } from 'lucide-react'
import type { HouseListing, SupplierRole, UtilizationIntent } from '../types'
import {
  ADDRESS_LEVEL_LABEL,
  CROPS,
  HOUSE_TYPES,
  INTENT_LABEL,
  LIVABLE_LABEL,
  REGIONS,
  SUPPLIER_ROLE_META,
  TRANSACTION_TYPE_LABEL,
} from '../data/constants'
import { DEFAULT_FIELD_CHECK_ITEMS } from '../data/constants'
import { eventsRepo, listingsRepo, sessionRepo } from '../repositories'
import { uid, nowIso } from '../repositories/storage'
import PhotoUploader from '../components/PhotoUploader'
import {
  Btn,
  Card,
  CheckboxRow,
  ErrorBox,
  Field,
  NumInput,
  SelectInput,
  StatusBadge,
  TextInput,
  TriRadio,
  inputCls,
} from '../components/ui'

const STEPS = ['출처·동의', '기본정보', '거래조건', '영농조건', '생활조건', '사진 등록'] as const

function emptyListing(role: SupplierRole): HouseListing {
  const id = uid()
  return {
    id,
    schemaVersion: 1,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    supplierRole: role,
    status: 'draft',
    isDemo: false,
    consent: {
      isOwnerSelf: role === 'owner',
      ownerName: '',
      ownerContact: '',
      intent: 'rent',
      consentConfirmed: false,
    },
    basic: {
      name: '',
      region: '애월읍',
      addressPublicLevel: 'town',
      houseType: '단독주택',
      buildingRegisterChecked: 'unknown',
      accessible: 'unknown',
      livableOpinion: 'unknown',
    },
    transaction: { type: 'monthly', priceNegotiable: false, publicProgramLinked: false },
    farm: {
      crops: [],
      farmlandLinkage: 'unknown',
      truckAccess: 'unknown',
      machineAccess: 'unknown',
      turnaround: 'unknown',
      hasStorage: 'unknown',
      storageUsable: 'unknown',
      hasYard: 'unknown',
      outdoorWater: 'unknown',
      workspace: 'unknown',
    },
    living: {
      waterSupply: 'unknown',
      groundwater: 'unknown',
      electricity: 'unknown',
      heating: '',
      boilerChecked: 'unknown',
      internetAvailable: 'unknown',
      sewage: '',
      mobileSignal: 'unknown',
    },
    photos: [],
    photoNA: [],
    analysisStatus: 'none',
    fieldCheckItems: DEFAULT_FIELD_CHECK_ITEMS.map((label) => ({ id: uid(), label, custom: false })),
    publishConfirmations: { privacyChecked: false, safetyNoticeChecked: false, fieldCheckChecked: false },
  }
}

/** /supplier/listings/new — 초안을 만들고 편집 화면으로 이동해 새로고침에도 복구되게 한다 */
export function NewListing() {
  const navigate = useNavigate()
  const created = useRef(false)
  useEffect(() => {
    if (created.current) return
    created.current = true
    const role = sessionRepo.get()?.role ?? 'owner'
    const draft = emptyListing(role)
    listingsRepo.save(draft)
    eventsRepo.log('listing_started', { supplierRole: role, listingId: draft.id })
    navigate(`/supplier/listings/${draft.id}/edit`, { replace: true })
  }, [navigate])
  return <p className="text-sm text-basalt-500">새 빈집 초안을 만드는 중…</p>
}

export default function ListingForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const initial = useMemo(() => (id ? listingsRepo.get(id) : undefined), [id])
  const [listing, setListing] = useState<HouseListing | undefined>(initial)
  const [step, setStep] = useState(initial?.formStep ?? 0)
  const [saveError, setSaveError] = useState<string>()
  const [stepError, setStepError] = useState<string>()

  // 변경 시 자동 저장 → 새로고침 후에도 작성 내용 복구
  const skipFirst = useRef(true)
  useEffect(() => {
    if (!listing) return
    if (skipFirst.current) {
      skipFirst.current = false
      return
    }
    const result = listingsRepo.save({ ...listing, formStep: step })
    setSaveError(result.ok ? undefined : result.error)
    if (result.ok && result.listing.status !== listing.status) {
      setListing((cur) => (cur ? { ...cur, status: result.listing.status } : cur))
    }
    eventsRepo.log('listing_draft_saved', { supplierRole: listing.supplierRole, listingId: listing.id })
  }, [listing, step])

  if (!id || !initial || !listing) {
    return (
      <ErrorBox
        title="존재하지 않는 빈집입니다"
        detail="주소가 잘못되었거나 이미 보관 처리된 매물일 수 있습니다."
        action={<Link className="text-sm font-medium text-pine-600 underline" to="/supplier/listings">빈집 목록으로 이동</Link>}
      />
    )
  }

  const set = (patch: Partial<HouseListing>) => setListing((cur) => (cur ? { ...cur, ...patch } : cur))
  const role = listing.supplierRole

  const validateStep = (s: number): string | undefined => {
    if (s === 0) {
      if (!listing.consent.ownerName.trim()) return '소유자 성명(또는 관리 주체)을 입력하세요.'
      if (!listing.consent.ownerContact.trim()) return '소유자 연락처를 입력하세요.'
      if (role !== 'owner' && !listing.consent.consentConfirmed)
        return "공인중개사·기관은 '소유자의 등록·공개 동의를 확인했습니다'에 동의해야 다음 단계로 넘어갈 수 있습니다."
    }
    if (s === 1) {
      if (!listing.basic.name.trim()) return '빈집명을 입력하세요.'
      if (!listing.basic.region) return '제주 지역을 선택하세요.'
      if (listing.basic.addressPublicLevel === 'ri' && !listing.basic.ri?.trim())
        return "'리 단위까지 공개'를 선택한 경우 리 이름을 입력하세요."
    }
    return undefined
  }

  const goNext = () => {
    const err = validateStep(step)
    setStepError(err)
    if (err) return
    if (step === 0 && listing.consent.consentConfirmed) {
      eventsRepo.log('owner_consent_confirmed', { supplierRole: role, listingId: listing.id })
    }
    if (step < STEPS.length - 1) setStep(step + 1)
  }

  const progress = Math.round(((step + 1) / STEPS.length) * 100)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-basalt-900">{listing.basic.name || '새 빈집 등록'}</h1>
          <p className="mt-0.5 text-xs text-basalt-500">작성 내용은 자동 저장되어 새로고침 후에도 유지됩니다.</p>
        </div>
        <StatusBadge status={listing.status} />
      </div>

      <div className="mb-5">
        <div className="mb-1 flex items-center justify-between text-xs text-basalt-500">
          <span>{step + 1}단계 / {STEPS.length}단계 — {STEPS[step]}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-sand-100" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-pine-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => { setStepError(undefined); setStep(i) }}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                i === step ? 'bg-citrus-500 text-white' : 'bg-sand-100 text-basalt-500 hover:bg-sand-200'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
      </div>

      {saveError && <div className="mb-4"><ErrorBox title="저장 실패" detail={saveError} /></div>}
      {stepError && <div className="mb-4"><ErrorBox title="입력을 확인해주세요" detail={stepError} /></div>}

      <Card className="mb-5">
        {step === 0 && <StepConsent listing={listing} set={set} />}
        {step === 1 && <StepBasic listing={listing} set={set} />}
        {step === 2 && <StepTransaction listing={listing} set={set} />}
        {step === 3 && <StepFarm listing={listing} set={set} />}
        {step === 4 && <StepLiving listing={listing} set={set} />}
        {step === 5 && (
          <PhotoUploader
            photos={listing.photos}
            photoNA={listing.photoNA}
            onChange={(photos) => {
              set({ photos })
              eventsRepo.log('photos_uploaded', { supplierRole: role, listingId: listing.id })
            }}
            onChangeNA={(photoNA) => set({ photoNA })}
          />
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Btn variant="ghost" onClick={() => navigate('/supplier/listings')}>
          <Save className="h-4 w-4" aria-hidden /> 저장하고 목록으로
        </Btn>
        <div className="flex gap-2">
          <Btn variant="secondary" disabled={step === 0} onClick={() => { setStepError(undefined); setStep(step - 1) }}>
            <ChevronLeft className="h-4 w-4" aria-hidden /> 이전
          </Btn>
          {step < STEPS.length - 1 ? (
            <Btn onClick={goNext}>
              다음 <ChevronRight className="h-4 w-4" aria-hidden />
            </Btn>
          ) : (
            <Btn onClick={() => navigate(`/supplier/listings/${listing.id}/analysis`)}>
              <Sparkles className="h-4 w-4" aria-hidden /> AI 분석으로 이동
            </Btn>
          )}
        </div>
      </div>
    </div>
  )
}

type StepProps = { listing: HouseListing; set: (patch: Partial<HouseListing>) => void }

function StepConsent({ listing, set }: StepProps) {
  const c = listing.consent
  const setC = (patch: Partial<typeof c>) => set({ consent: { ...c, ...patch } })
  const role = listing.supplierRole
  return (
    <div>
      <Field label="등록자 유형">
        <p className="rounded-lg bg-sand-100 px-3 py-2 text-sm">{SUPPLIER_ROLE_META[role].label}</p>
      </Field>
      {role === 'owner' && (
        <Field label="빈집 소유자 본인 여부">
          <TriRadio
            name="본인 여부"
            value={c.isOwnerSelf ? 'yes' : 'no'}
            onChange={(v) => setC({ isOwnerSelf: v === 'yes' })}
            labels={{ yes: '본인', no: '관리 권한 보유', unknown: '—' }}
          />
        </Field>
      )}
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="소유자 성명 또는 관리 주체" required>
          <TextInput value={c.ownerName} onChange={(v) => setC({ ownerName: v })} placeholder="예: 홍길동" />
        </Field>
        <Field label="소유자 연락처" required hint="수요자에게 공개되지 않습니다.">
          <TextInput value={c.ownerContact} onChange={(v) => setC({ ownerContact: v })} placeholder="010-0000-0000" />
        </Field>
      </div>
      <Field label="빈집 활용 의사" required>
        <SelectInput
          value={c.intent}
          onChange={(v) => setC({ intent: v as UtilizationIntent })}
          options={(Object.keys(INTENT_LABEL) as UtilizationIntent[]).map((k) => ({ value: k, label: INTENT_LABEL[k] }))}
        />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="동의 확인일">
          <TextInput type="date" value={c.consentDate ?? ''} onChange={(v) => setC({ consentDate: v })} />
        </Field>
        <Field label="동의 증빙파일명" hint="파일명만 기록하며 수요자 화면에 공개되지 않습니다.">
          <TextInput value={c.evidenceFileName ?? ''} onChange={(v) => setC({ evidenceFileName: v })} placeholder="예: 활용동의서.pdf" />
        </Field>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field label="등록 담당자">
          <TextInput value={c.managerName ?? ''} onChange={(v) => setC({ managerName: v })} />
        </Field>
        <Field label="담당기관·공인중개사">
          <TextInput value={c.managerOrg ?? ''} onChange={(v) => setC({ managerOrg: v })} />
        </Field>
        <Field label="담당자 연락처">
          <TextInput value={c.managerContact ?? ''} onChange={(v) => setC({ managerContact: v })} />
        </Field>
      </div>
      <div className="mt-2 rounded-lg border border-pine-100 bg-pine-50 p-3">
        <CheckboxRow
          id="consent-check"
          checked={c.consentConfirmed}
          onChange={(v) => setC({ consentConfirmed: v, consentDate: c.consentDate || (v ? new Date().toISOString().slice(0, 10) : c.consentDate) })}
          label={
            role === 'owner'
              ? '소유자 본인(또는 관리 권한자)으로서 이 빈집의 등록·공개에 동의합니다.'
              : '소유자의 등록·공개 동의를 확인했습니다.'
          }
        />
        {role !== 'owner' && !c.consentConfirmed && (
          <p className="mt-1 pl-6 text-xs text-citrus-600">동의 확인 전에는 다음 단계로 진행할 수 없습니다.</p>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-basalt-500">
        터잡앙은 소유권을 자동 판정하지 않으며, 동의 여부는 공급자가 제출한 정보로만 관리됩니다. 이 확인은 법률 검증이
        완료되었음을 뜻하지 않습니다.
      </p>
    </div>
  )
}

function StepBasic({ listing, set }: StepProps) {
  const b = listing.basic
  const setB = (patch: Partial<typeof b>) => set({ basic: { ...b, ...patch } })
  return (
    <div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="빈집명" required hint="수요자에게 표시되는 이름입니다. 예: 애월 귤밭 돌담집">
          <TextInput value={b.name} onChange={(v) => setB({ name: v })} />
        </Field>
        <Field label="제주 지역" required>
          <SelectInput value={b.region} onChange={(v) => setB({ region: v })} options={REGIONS.map((r) => ({ value: r, label: r }))} />
        </Field>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="상세주소" hint="내부 관리용 — 수요자에게 공개되지 않습니다.">
          <TextInput value={b.addressDetail ?? ''} onChange={(v) => setB({ addressDetail: v })} />
        </Field>
        <Field label="리 이름" hint="'리 단위까지 공개' 선택 시 수요자에게 표시됩니다.">
          <TextInput value={b.ri ?? ''} onChange={(v) => setB({ ri: v })} placeholder="예: 소길리" />
        </Field>
      </div>
      <Field label="수요자 공개용 주소 범위" required>
        <SelectInput
          value={b.addressPublicLevel}
          onChange={(v) => setB({ addressPublicLevel: v })}
          options={(Object.keys(ADDRESS_LEVEL_LABEL) as (keyof typeof ADDRESS_LEVEL_LABEL)[]).map((k) => ({ value: k, label: ADDRESS_LEVEL_LABEL[k] }))}
        />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field label="주택유형" required>
          <SelectInput value={b.houseType} onChange={(v) => setB({ houseType: v })} options={HOUSE_TYPES.map((t) => ({ value: t, label: t }))} />
        </Field>
        <Field label="연면적">
          <NumInput value={b.floorAreaM2} onChange={(v) => setB({ floorAreaM2: v })} suffix="㎡" />
        </Field>
        <Field label="대지면적">
          <NumInput value={b.landAreaM2} onChange={(v) => setB({ landAreaM2: v })} suffix="㎡" />
        </Field>
        <Field label="건축연도">
          <NumInput value={b.builtYear} onChange={(v) => setB({ builtYear: v })} placeholder="예: 1990" />
        </Field>
        <Field label="방 수">
          <NumInput value={b.rooms} onChange={(v) => setB({ rooms: v })} suffix="개" />
        </Field>
        <Field label="화장실 수">
          <NumInput value={b.baths} onChange={(v) => setB({ baths: v })} suffix="개" />
        </Field>
        <Field label="층수">
          <NumInput value={b.floors} onChange={(v) => setB({ floors: v })} suffix="층" />
        </Field>
        <Field label="공실 기간">
          <NumInput value={b.vacantMonths} onChange={(v) => setB({ vacantMonths: v })} suffix="개월" />
        </Field>
      </div>
      <Field label="빈집 등급·기존 조사정보" hint="지자체 실태조사 결과 등이 있으면 기록하세요.">
        <TextInput value={b.gradeInfo ?? ''} onChange={(v) => setB({ gradeInfo: v })} />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="건축물대장 확인 여부">
          <TriRadio name="건축물대장" value={b.buildingRegisterChecked} onChange={(v) => setB({ buildingRegisterChecked: v })} labels={{ yes: '확인함', no: '확인 못 함', unknown: '확인되지 않음' }} />
        </Field>
        <Field label="현재 출입 가능 여부">
          <TriRadio name="출입 가능" value={b.accessible} onChange={(v) => setB({ accessible: v })} labels={{ yes: '가능', no: '불가', unknown: '확인되지 않음' }} />
        </Field>
      </div>
      <Field label="현재 거주 가능 여부 (공급자 의견)" hint="공급자 의견으로 표시되며, 안전진단 결과처럼 표현되지 않습니다.">
        <SelectInput
          value={b.livableOpinion}
          onChange={(v) => setB({ livableOpinion: v })}
          options={(Object.keys(LIVABLE_LABEL) as (keyof typeof LIVABLE_LABEL)[]).map((k) => ({ value: k, label: LIVABLE_LABEL[k] }))}
        />
      </Field>
    </div>
  )
}

function StepTransaction({ listing, set }: StepProps) {
  const t = listing.transaction
  const setT = (patch: Partial<typeof t>) => set({ transaction: { ...t, ...patch } })
  return (
    <div>
      <Field label="거래유형" required>
        <SelectInput
          value={t.type}
          onChange={(v) => setT({ type: v })}
          options={(Object.keys(TRANSACTION_TYPE_LABEL) as (keyof typeof TRANSACTION_TYPE_LABEL)[]).map((k) => ({ value: k, label: TRANSACTION_TYPE_LABEL[k] }))}
        />
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {(t.type === 'monthly' || t.type === 'jeonse' || t.type === 'public_rent' || t.type === 'negotiable') && (
          <Field label="보증금">
            <NumInput value={t.depositManwon} onChange={(v) => setT({ depositManwon: v })} suffix="만 원" />
          </Field>
        )}
        {(t.type === 'monthly' || t.type === 'public_rent' || t.type === 'negotiable') && (
          <Field label="월 임대료">
            <NumInput value={t.monthlyRentManwon} onChange={(v) => setT({ monthlyRentManwon: v })} suffix="만 원" />
          </Field>
        )}
        {(t.type === 'sale' || t.type === 'negotiable') && (
          <Field label="매매가">
            <NumInput value={t.salePriceManwon} onChange={(v) => setT({ salePriceManwon: v })} suffix="만 원" />
          </Field>
        )}
        <Field label="관리비">
          <NumInput value={t.maintenanceFeeManwon} onChange={(v) => setT({ maintenanceFeeManwon: v })} suffix="만 원" />
        </Field>
        <Field label="최소 계약기간">
          <NumInput value={t.minContractMonths} onChange={(v) => setT({ minContractMonths: v })} suffix="개월" />
        </Field>
        <Field label="입주 가능일">
          <TextInput type="date" value={t.moveInDate ?? ''} onChange={(v) => setT({ moveInDate: v })} />
        </Field>
      </div>
      <div className="mb-3 space-y-2">
        <CheckboxRow id="nego" checked={t.priceNegotiable} onChange={(v) => setT({ priceNegotiable: v })} label="가격 협의 가능" />
        <CheckboxRow id="public-link" checked={t.publicProgramLinked} onChange={(v) => setT({ publicProgramLinked: v })} label="공공지원사업 연계" />
      </div>
      <Field label="추가 계약조건">
        <textarea className={inputCls} rows={3} value={t.extraTerms ?? ''} onChange={(e) => setT({ extraTerms: e.target.value })} />
      </Field>
      <Field label="중개 담당자" hint="내부 관리용 — 수요자에게 공개되지 않습니다.">
        <TextInput value={t.agentName ?? ''} onChange={(v) => setT({ agentName: v })} />
      </Field>
    </div>
  )
}

function StepFarm({ listing, set }: StepProps) {
  const f = listing.farm
  const setF = (patch: Partial<typeof f>) => set({ farm: { ...f, ...patch } })
  const toggleCrop = (crop: string) =>
    setF({ crops: f.crops.includes(crop) ? f.crops.filter((c) => c !== crop) : [...f.crops, crop] })
  return (
    <div>
      <Field label="인근 주요 작목" hint="해당하는 항목을 모두 선택하세요.">
        <div className="flex flex-wrap gap-1.5">
          {CROPS.map((crop) => (
            <button
              key={crop}
              type="button"
              aria-pressed={f.crops.includes(crop)}
              onClick={() => toggleCrop(crop)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                f.crops.includes(crop) ? 'border-citrus-500 bg-citrus-500 text-white' : 'border-sand-200 bg-white text-basalt-500'
              }`}
            >
              {crop}
            </button>
          ))}
        </div>
      </Field>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field label="가장 가까운 농지까지 거리">
          <NumInput value={f.farmDistanceKm} onChange={(v) => setF({ farmDistanceKm: v })} suffix="km" />
        </Field>
        <Field label="농지까지 차량 이동시간">
          <NumInput value={f.farmDriveMinutes} onChange={(v) => setF({ farmDriveMinutes: v })} suffix="분" />
        </Field>
        <Field label="진입로 폭">
          <NumInput value={f.roadWidthM} onChange={(v) => setF({ roadWidthM: v })} suffix="m" />
        </Field>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="농지 임대·매매 연계 가능 여부">
          <TriRadio name="농지 연계" value={f.farmlandLinkage} onChange={(v) => setF({ farmlandLinkage: v })} labels={{ yes: '가능', no: '불가', unknown: '확인되지 않음' }} />
        </Field>
        <Field label="1톤 트럭 진입 가능">
          <TriRadio name="트럭 진입" value={f.truckAccess} onChange={(v) => setF({ truckAccess: v })} labels={{ yes: '가능', no: '불가', unknown: '확인되지 않음' }} />
        </Field>
        <Field label="소형 농기계 진입 가능">
          <TriRadio name="농기계 진입" value={f.machineAccess} onChange={(v) => setF({ machineAccess: v })} labels={{ yes: '가능', no: '불가', unknown: '확인되지 않음' }} />
        </Field>
        <Field label="차량 회차 가능">
          <TriRadio name="회차" value={f.turnaround} onChange={(v) => setF({ turnaround: v })} labels={{ yes: '가능', no: '불가', unknown: '확인되지 않음' }} />
        </Field>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field label="주차 가능 대수">
          <NumInput value={f.parkingCount} onChange={(v) => setF({ parkingCount: v })} suffix="대" />
        </Field>
        <Field label="창고 면적">
          <NumInput value={f.storageAreaM2} onChange={(v) => setF({ storageAreaM2: v })} suffix="㎡" />
        </Field>
        <Field label="마당 면적">
          <NumInput value={f.yardAreaM2} onChange={(v) => setF({ yardAreaM2: v })} suffix="㎡" />
        </Field>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="창고 유무">
          <TriRadio name="창고" value={f.hasStorage} onChange={(v) => setF({ hasStorage: v })} />
        </Field>
        <Field label="농산물·농기구 보관 가능">
          <TriRadio name="보관 가능" value={f.storageUsable} onChange={(v) => setF({ storageUsable: v })} labels={{ yes: '가능', no: '불가', unknown: '확인되지 않음' }} />
        </Field>
        <Field label="마당 유무">
          <TriRadio name="마당" value={f.hasYard} onChange={(v) => setF({ hasYard: v })} />
        </Field>
        <Field label="외부 수도">
          <TriRadio name="외부 수도" value={f.outdoorWater} onChange={(v) => setF({ outdoorWater: v })} />
        </Field>
        <Field label="농작업 공간">
          <TriRadio name="농작업 공간" value={f.workspace} onChange={(v) => setF({ workspace: v })} />
        </Field>
      </div>
      <Field label="추가로 알리고 싶은 영농환경">
        <textarea className={inputCls} rows={3} value={f.note ?? ''} onChange={(e) => setF({ note: e.target.value })} />
      </Field>
      <p className="text-xs text-basalt-500">
        수요자 적합도 점수와 추천 순위는 수요자 사이드에서 사용자 조건에 따라 계산되며, 공급자가 입력하지 않습니다.
      </p>
    </div>
  )
}

function StepLiving({ listing, set }: StepProps) {
  const l = listing.living
  const setL = (patch: Partial<typeof l>) => set({ living: { ...l, ...patch } })
  return (
    <div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="상수도">
          <TriRadio name="상수도" value={l.waterSupply} onChange={(v) => setL({ waterSupply: v })} />
        </Field>
        <Field label="지하수">
          <TriRadio name="지하수" value={l.groundwater} onChange={(v) => setL({ groundwater: v })} />
        </Field>
        <Field label="전기">
          <TriRadio name="전기" value={l.electricity} onChange={(v) => setL({ electricity: v })} />
        </Field>
        <Field label="보일러 작동 확인 여부">
          <TriRadio name="보일러" value={l.boilerChecked} onChange={(v) => setL({ boilerChecked: v })} labels={{ yes: '작동 확인', no: '미작동 확인', unknown: '확인되지 않음' }} />
        </Field>
        <Field label="인터넷 설치 가능">
          <TriRadio name="인터넷" value={l.internetAvailable} onChange={(v) => setL({ internetAvailable: v })} labels={{ yes: '가능', no: '불가', unknown: '확인되지 않음' }} />
        </Field>
        <Field label="난방방식" hint="확인되지 않았으면 비워두세요.">
          <TextInput value={l.heating} onChange={(v) => setL({ heating: v })} placeholder="예: 기름보일러" />
        </Field>
        <Field label="정화조·하수도">
          <TextInput value={l.sewage} onChange={(v) => setL({ sewage: v })} placeholder="예: 정화조 / 공공하수도" />
        </Field>
        <Field label="쓰레기 배출 장소">
          <TextInput value={l.trashSite ?? ''} onChange={(v) => setL({ trashSite: v })} placeholder="예: 마을 클린하우스 도보 3분" />
        </Field>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-3">
        <Field label="가장 가까운 버스정류장">
          <NumInput value={l.busStopDistanceM} onChange={(v) => setL({ busStopDistanceM: v })} suffix="m" />
        </Field>
        <Field label="마트까지 거리">
          <NumInput value={l.martDistanceKm} onChange={(v) => setL({ martDistanceKm: v })} suffix="km" />
        </Field>
        <Field label="병원·보건소까지 거리">
          <NumInput value={l.hospitalDistanceKm} onChange={(v) => setL({ hospitalDistanceKm: v })} suffix="km" />
        </Field>
        <Field label="읍·면 중심지까지 거리">
          <NumInput value={l.townCenterDistanceKm} onChange={(v) => setL({ townCenterDistanceKm: v })} suffix="km" />
        </Field>
        <Field label="인근 주택과의 거리">
          <NumInput value={l.neighborDistanceM} onChange={(v) => setL({ neighborDistanceM: v })} suffix="m" />
        </Field>
        <Field label="휴대전화 수신 상태">
          <SelectInput
            value={l.mobileSignal}
            onChange={(v) => setL({ mobileSignal: v })}
            options={[
              { value: 'good', label: '양호' },
              { value: 'weak', label: '약함' },
              { value: 'unknown', label: '확인되지 않음' },
            ]}
          />
        </Field>
      </div>
      <Field label="기타 생활환경">
        <textarea className={inputCls} rows={3} value={l.note ?? ''} onChange={(e) => setL({ note: e.target.value })} />
      </Field>
      <p className="text-xs text-basalt-500">확인하지 못한 항목은 '확인되지 않음'으로 남겨두세요. '없음'과 구분되어 수요자에게 표시됩니다.</p>
    </div>
  )
}
