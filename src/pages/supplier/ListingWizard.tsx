import { ArrowLeft, ArrowRight, ImagePlus, Save, Star, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/ui'
import { CheckField, FieldRow, NumberInput, TextInput, TriSelect, inputCls } from '../../components/supplier/ui'
import { getListingById, newEmptyListing, saveListing } from '../../repositories/listingsRepository'
import { loadSupplierProfile } from '../../repositories/supplierSessionRepository'
import { photoCompleteness } from '../../services/publication'
import { REGIONS } from '../../types'
import type { HouseListing, PhotoCategory, SupplierPhoto } from '../../types/supplier'
import { DEAL_TYPES, HOUSE_TYPES, PHOTO_CATEGORIES } from '../../types/supplier'
import { trackEvent } from '../../utils/analytics'

const STEPS = ['출처·동의', '기본정보', '거래조건', '영농조건', '생활조건', '사진 등록']
const CROP_OPTIONS = ['감귤', '밭작물', '시설원예', '특용작물', '축산', '기타']
const NA_ALLOWED: PhotoCategory[] = ['창고', '마당·주차공간']
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_MB = 10
const MIN_DIMENSION = 800

/** 업로드 원본 미리보기 (세션 메모리 전용 — localStorage에 저장하지 않음) */
const previewUrls = new Map<string, string>()

function readDimensions(file: File): Promise<{ w: number; h: number; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight, url })
    img.onerror = () => reject(new Error('이미지를 읽을 수 없어요.'))
    img.src = url
  })
}

export default function ListingWizard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const profile = loadSupplierProfile()
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [notFound, setNotFound] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const startedTracked = useRef(false)

  const [listing, setListing] = useState<HouseListing | null>(() => {
    if (id) return getListingById(id)
    return newEmptyListing(profile?.type ?? '빈집 소유자')
  })

  useEffect(() => {
    if (id && !listing) setNotFound(true)
  }, [id, listing])

  useEffect(() => {
    if (!id && !startedTracked.current) {
      startedTracked.current = true
      trackEvent('listing_started', undefined, profile?.type)
    }
  }, [id, profile])

  const photos = useMemo(() => (listing ? photoCompleteness(listing) : null), [listing])

  if (notFound || !listing) {
    return (
      <ErrorState
        title="빈집을 찾을 수 없어요"
        message="주소가 잘못되었거나 삭제된 매물이에요."
        onRetry={() => navigate('/supplier/listings')}
        retryLabel="목록으로 돌아가기"
      />
    )
  }

  const set = (patch: Partial<HouseListing>) => setListing({ ...listing, ...patch })

  const derivedStatus = (l: HouseListing): HouseListing['status'] => {
    if (!['draft', 'incomplete', 'analysis_pending'].includes(l.status)) return l.status
    const basicOk = l.basic.name.trim() !== '' && l.basic.floorAreaM2 > 0
    const pc = photoCompleteness(l)
    if (basicOk && pc.missing.length === 0) return l.analysis ? l.status : 'analysis_pending'
    if (basicOk) return 'incomplete'
    return 'draft'
  }

  const persist = (silent = false): HouseListing => {
    const next = { ...listing, status: derivedStatus(listing) }
    saveListing(next, profile?.type ?? '공급자', '작성 내용 저장')
    trackEvent('listing_draft_saved', next.id, profile?.type)
    setListing(next)
    if (!silent) setNotice('작성 내용을 저장했어요. 새로고침해도 유지됩니다.')
    return next
  }

  const stepError = (): string => {
    if (step === 0) {
      if (!listing.consent.utilizationIntent) return '빈집 활용 의사를 선택해 주세요.'
      if (!listing.consent.isOwnerSelf && !listing.consent.consentConfirmed)
        return '공인중개사·기관은 “소유자의 등록·공개 동의를 확인했습니다”에 동의해야 다음 단계로 진행할 수 있어요.'
      if (listing.consent.consentConfirmed && !listing.consent.consentDate) return '동의 확인일을 입력해 주세요.'
    }
    if (step === 1) {
      if (!listing.basic.name.trim()) return '빈집명을 입력해 주세요.'
      if (listing.basic.floorAreaM2 <= 0) return '연면적을 입력해 주세요.'
      if (listing.basic.builtYear < 1900) return '건축연도를 입력해 주세요.'
    }
    if (step === 2 && !listing.transaction.dealType) return '거래유형을 선택해 주세요.'
    return ''
  }

  const goNext = () => {
    const err = stepError()
    if (err) {
      setError(err)
      return
    }
    setError('')
    if (step === 0 && listing.consent.consentConfirmed) {
      trackEvent('owner_consent_confirmed', listing.id, profile?.type)
    }
    persist(true)
    if (step < STEPS.length - 1) {
      setStep(step + 1)
      window.scrollTo({ top: 0 })
    } else {
      const saved = persist(true)
      const pc = photoCompleteness(saved)
      if (pc.missing.length === 0) trackEvent('photo_requirements_completed', saved.id, profile?.type)
      navigate(`/supplier/listings/${saved.id}/analysis`)
    }
  }

  const addFiles = async (files: FileList) => {
    setError('')
    const existingNames = new Set(listing.photos.map((p) => p.fileName))
    const added: SupplierPhoto[] = []
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`‘${file.name}’ — JPG·PNG·WebP 형식만 등록할 수 있어요.`)
        continue
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setError(`‘${file.name}’ — 파일 크기가 ${MAX_FILE_MB}MB를 초과해요.`)
        continue
      }
      if (existingNames.has(file.name)) {
        setError(`‘${file.name}’ — 같은 이름의 파일이 이미 등록되어 있어요.`)
        continue
      }
      try {
        const dim = await readDimensions(file)
        if (dim.w < MIN_DIMENSION && dim.h < MIN_DIMENSION) {
          setError(`‘${file.name}’ — 해상도가 너무 낮아요 (최소 ${MIN_DIMENSION}px). 단순 형식 검증 결과이며 AI 품질 분석이 아닙니다.`)
          URL.revokeObjectURL(dim.url)
          continue
        }
        const photoId = `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
        previewUrls.set(photoId, dim.url)
        const missing = photoCompleteness({ ...listing, photos: [...listing.photos, ...added] }).missing
        added.push({
          id: photoId,
          category: missing[0] ?? '건물 정면',
          fileName: file.name,
          fileSize: file.size,
          description: '',
          takenAt: new Date().toISOString().slice(0, 10),
          isPrimary: listing.photos.length === 0 && added.length === 0,
          isPublic: true,
          isDemoImage: false,
        })
        existingNames.add(file.name)
      } catch {
        setError(`‘${file.name}’ — 이미지를 읽지 못했어요. 다시 시도해 주세요.`)
      }
    }
    if (added.length > 0) {
      set({ photos: [...listing.photos, ...added] })
      trackEvent('photos_uploaded', listing.id, profile?.type)
      setNotice(`${added.length}장을 추가했어요. 사진 원본은 브라우저 저장 용량 제한으로 저장되지 않고, 이 세션에서만 미리보기가 가능해요.`)
    }
  }

  const updatePhoto = (photoId: string, patch: Partial<SupplierPhoto>) => {
    set({
      photos: listing.photos.map((p) =>
        p.id === photoId ? { ...p, ...patch } : patch.isPrimary ? { ...p, isPrimary: false } : p,
      ),
    })
  }

  const removePhoto = (photoId: string) => {
    const url = previewUrls.get(photoId)
    if (url) URL.revokeObjectURL(url)
    previewUrls.delete(photoId)
    set({ photos: listing.photos.filter((p) => p.id !== photoId) })
  }

  const toggleNA = (category: PhotoCategory) => {
    set({
      photoNA: listing.photoNA.includes(category)
        ? listing.photoNA.filter((c) => c !== category)
        : [...listing.photoNA, category],
    })
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/supplier/listings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden />
        목록으로
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight">{id ? '빈집 정보 수정' : '새 빈집 등록'}</h1>
        <button type="button" onClick={() => persist()} className="inline-flex items-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-3.5 py-2 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40">
          <Save className="size-4" aria-hidden />
          임시 저장
        </button>
      </div>

      {/* 진행률 */}
      <ol className="mt-5 flex items-center gap-1" aria-label="등록 단계">
        {STEPS.map((title, i) => (
          <li key={title} className="flex flex-1 flex-col gap-1" aria-current={i === step ? 'step' : undefined}>
            <button type="button" onClick={() => setStep(i)} className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-forest' : 'bg-sand'}`} aria-label={`${i + 1}단계 ${title}`} />
            <span className={`hidden text-[11px] font-medium sm:block ${i === step ? 'text-forest-dark' : 'text-stone'}`}>
              {i + 1}. {title}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-1 text-xs text-stone sm:hidden">
        {step + 1}단계 / {STEPS.length} — {STEPS[step]}
      </p>

      <div className="mt-5 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand sm:p-7">
        {step === 0 && (
          <div className="space-y-5">
            <p className="rounded-xl bg-sand/60 p-3.5 text-xs leading-relaxed text-stone">
              터잡앙은 소유권을 자동 판정하지 않아요. 동의 여부는 공급자가 제출한 정보로만 관리되며, 동의 증빙과 소유자
              연락처는 수요자 화면에 공개되지 않습니다. 실제 법률 검증이 완료된 것은 아닙니다.
            </p>
            <FieldRow label="등록자 유형">
              <p className="rounded-xl bg-leaf px-3.5 py-2.5 text-sm font-semibold text-forest-dark">{listing.supplierType} (진입 시 선택)</p>
            </FieldRow>
            <CheckField checked={listing.consent.isOwnerSelf} onChange={(v) => set({ consent: { ...listing.consent, isOwnerSelf: v } })} label="빈집 소유자 본인입니다" />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="소유자 성명 또는 관리 주체">
                <TextInput value={listing.consent.ownerName} onChange={(v) => set({ consent: { ...listing.consent, ownerName: v } })} placeholder="비공개 정보" />
              </FieldRow>
              <FieldRow label="소유자 연락처">
                <TextInput value={listing.consent.ownerContact} onChange={(v) => set({ consent: { ...listing.consent, ownerContact: v } })} placeholder="비공개 정보" />
              </FieldRow>
            </div>
            <FieldRow label="빈집 활용 의사 *">
              <div className="flex flex-wrap gap-1.5">
                {(['임대', '매매', '공공사업 연계', '협의 필요'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={listing.consent.utilizationIntent === v} onClick={() => set({ consent: { ...listing.consent, utilizationIntent: v } })} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${listing.consent.utilizationIntent === v ? 'border-forest bg-forest text-white' : 'border-sand bg-white hover:border-forest/40'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </FieldRow>
            <CheckField
              checked={listing.consent.consentConfirmed}
              onChange={(v) => set({ consent: { ...listing.consent, consentConfirmed: v } })}
              label={listing.consent.isOwnerSelf ? '등록·공개에 동의합니다' : '소유자의 등록·공개 동의를 확인했습니다 *'}
              sub="공인중개사·기관은 이 항목에 동의해야 다음 단계로 진행할 수 있어요."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="동의 확인일">
                <TextInput type="date" value={listing.consent.consentDate} onChange={(v) => set({ consent: { ...listing.consent, consentDate: v } })} />
              </FieldRow>
              <FieldRow label="동의 증빙파일명" help="파일 자체는 저장되지 않아요 (비공개)">
                <TextInput value={listing.consent.consentEvidenceName} onChange={(v) => set({ consent: { ...listing.consent, consentEvidenceName: v } })} placeholder="예: 동의서_스캔본.pdf" />
              </FieldRow>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldRow label="등록 담당자">
                <TextInput value={listing.consent.registrantName} onChange={(v) => set({ consent: { ...listing.consent, registrantName: v } })} />
              </FieldRow>
              <FieldRow label="담당기관·공인중개사">
                <TextInput value={listing.consent.registrantOrg} onChange={(v) => set({ consent: { ...listing.consent, registrantOrg: v } })} />
              </FieldRow>
              <FieldRow label="담당자 연락처">
                <TextInput value={listing.consent.registrantContact} onChange={(v) => set({ consent: { ...listing.consent, registrantContact: v } })} placeholder="비공개 정보" />
              </FieldRow>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <FieldRow label="빈집명 *">
              <TextInput value={listing.basic.name} onChange={(v) => set({ basic: { ...listing.basic, name: v } })} placeholder="예: 애월 귤밭 돌담집" />
            </FieldRow>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="제주 지역 *">
                <select value={listing.basic.region} onChange={(e) => set({ basic: { ...listing.basic, region: e.target.value as HouseListing['basic']['region'] } })} className={inputCls}>
                  {[...REGIONS, '기타'].map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </FieldRow>
              <FieldRow label="주택유형">
                <select value={listing.basic.houseType} onChange={(e) => set({ basic: { ...listing.basic, houseType: e.target.value } })} className={inputCls}>
                  {HOUSE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FieldRow>
            </div>
            <FieldRow label="상세주소" help="수요자에게 공개되지 않으며, 아래 공개 범위 설정에 따라 가공돼요.">
              <TextInput value={listing.basic.fullAddress} onChange={(v) => set({ basic: { ...listing.basic, fullAddress: v } })} placeholder="비공개 정보" />
            </FieldRow>
            <FieldRow label="수요자 공개용 주소 범위">
              <div className="flex flex-wrap gap-1.5">
                {(['읍·면까지만 공개', '리 단위까지 공개', '방문 확정 후 공개'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={listing.basic.addressDisclosure === v} onClick={() => set({ basic: { ...listing.basic, addressDisclosure: v } })} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${listing.basic.addressDisclosure === v ? 'border-forest bg-forest text-white' : 'border-sand bg-white hover:border-forest/40'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </FieldRow>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FieldRow label="연면적 *">
                <NumberInput value={listing.basic.floorAreaM2} onChange={(v) => set({ basic: { ...listing.basic, floorAreaM2: v } })} suffix="㎡" />
              </FieldRow>
              <FieldRow label="대지면적">
                <NumberInput value={listing.basic.landAreaM2} onChange={(v) => set({ basic: { ...listing.basic, landAreaM2: v } })} suffix="㎡" />
              </FieldRow>
              <FieldRow label="건축연도 *">
                <NumberInput value={listing.basic.builtYear} onChange={(v) => set({ basic: { ...listing.basic, builtYear: v } })} suffix="년" />
              </FieldRow>
              <FieldRow label="공실 기간">
                <NumberInput value={listing.basic.vacancyMonths} onChange={(v) => set({ basic: { ...listing.basic, vacancyMonths: v } })} suffix="개월" />
              </FieldRow>
              <FieldRow label="방 수">
                <NumberInput value={listing.basic.rooms} onChange={(v) => set({ basic: { ...listing.basic, rooms: v } })} suffix="개" />
              </FieldRow>
              <FieldRow label="화장실 수">
                <NumberInput value={listing.basic.baths} onChange={(v) => set({ basic: { ...listing.basic, baths: v } })} suffix="개" />
              </FieldRow>
              <FieldRow label="층수">
                <NumberInput value={listing.basic.floors} onChange={(v) => set({ basic: { ...listing.basic, floors: v } })} suffix="층" />
              </FieldRow>
            </div>
            <FieldRow label="빈집 등급·기존 조사정보">
              <TextInput value={listing.basic.gradeInfo} onChange={(v) => set({ basic: { ...listing.basic, gradeInfo: v } })} placeholder="예: 빈집 실태조사 2등급" />
            </FieldRow>
            <CheckField checked={listing.basic.buildingRegisterChecked} onChange={(v) => set({ basic: { ...listing.basic, buildingRegisterChecked: v } })} label="건축물대장을 확인했습니다" />
            <FieldRow label="현재 출입 가능 여부">
              <TriSelect value={listing.basic.accessible} onChange={(v) => set({ basic: { ...listing.basic, accessible: v } })} yesLabel="출입 가능" noLabel="출입 어려움" />
            </FieldRow>
            <FieldRow label="현재 거주 가능 여부" help="공급자 의견으로 표시되며, 안전진단 결과가 아니에요.">
              <div className="flex flex-wrap gap-1.5">
                {(['바로 거주 가능', '소규모 수리 후 가능', '상당한 수리 필요', '판단 불가'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={listing.basic.habitability === v} onClick={() => set({ basic: { ...listing.basic, habitability: v } })} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${listing.basic.habitability === v ? 'border-forest bg-forest text-white' : 'border-sand bg-white hover:border-forest/40'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </FieldRow>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <FieldRow label="거래유형 *">
              <div className="flex flex-wrap gap-1.5">
                {DEAL_TYPES.map((v) => (
                  <button key={v} type="button" aria-pressed={listing.transaction.dealType === v} onClick={() => set({ transaction: { ...listing.transaction, dealType: v } })} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${listing.transaction.dealType === v ? 'border-forest bg-forest text-white' : 'border-sand bg-white hover:border-forest/40'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </FieldRow>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FieldRow label="보증금">
                <NumberInput value={listing.transaction.deposit} onChange={(v) => set({ transaction: { ...listing.transaction, deposit: v } })} suffix="만 원" step={100} />
              </FieldRow>
              <FieldRow label="월 임대료">
                <NumberInput value={listing.transaction.monthlyRent} onChange={(v) => set({ transaction: { ...listing.transaction, monthlyRent: v } })} suffix="만 원" step={5} />
              </FieldRow>
              <FieldRow label="매매가">
                <NumberInput value={listing.transaction.salePrice} onChange={(v) => set({ transaction: { ...listing.transaction, salePrice: v } })} suffix="만 원" step={100} />
              </FieldRow>
              <FieldRow label="관리비">
                <NumberInput value={listing.transaction.maintenanceFee} onChange={(v) => set({ transaction: { ...listing.transaction, maintenanceFee: v } })} suffix="만 원" />
              </FieldRow>
              <FieldRow label="최소 계약기간">
                <NumberInput value={listing.transaction.minContractMonths} onChange={(v) => set({ transaction: { ...listing.transaction, minContractMonths: v } })} suffix="개월" />
              </FieldRow>
              <FieldRow label="입주 가능일">
                <TextInput type="date" value={listing.transaction.moveInDate} onChange={(v) => set({ transaction: { ...listing.transaction, moveInDate: v } })} />
              </FieldRow>
            </div>
            <CheckField checked={listing.transaction.priceNegotiable} onChange={(v) => set({ transaction: { ...listing.transaction, priceNegotiable: v } })} label="가격 협의 가능" />
            <CheckField checked={listing.transaction.publicProgramLinked} onChange={(v) => set({ transaction: { ...listing.transaction, publicProgramLinked: v } })} label="공공지원사업 연계 (공공임대·귀농인의 집 등)" />
            <FieldRow label="추가 계약조건">
              <textarea rows={2} value={listing.transaction.extraTerms} onChange={(e) => set({ transaction: { ...listing.transaction, extraTerms: e.target.value } })} className={inputCls} />
            </FieldRow>
            <FieldRow label="중개 담당자">
              <TextInput value={listing.transaction.agentName} onChange={(v) => set({ transaction: { ...listing.transaction, agentName: v } })} />
            </FieldRow>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <p className="rounded-xl bg-sand/60 p-3.5 text-xs text-stone">
              수요자별 적합도 점수와 추천 순위는 수요자 조건에 따라 자동 계산되며, 공급자가 직접 입력하지 않아요.
            </p>
            <FieldRow label="인근 주요 작목">
              <div className="flex flex-wrap gap-1.5">
                {CROP_OPTIONS.map((c) => {
                  const on = listing.farm.nearbyCrops.includes(c)
                  return (
                    <button key={c} type="button" aria-pressed={on} onClick={() => set({ farm: { ...listing.farm, nearbyCrops: on ? listing.farm.nearbyCrops.filter((x) => x !== c) : [...listing.farm.nearbyCrops, c] } })} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${on ? 'border-forest bg-forest text-white' : 'border-sand bg-white hover:border-forest/40'}`}>
                      {c}
                    </button>
                  )
                })}
              </div>
            </FieldRow>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <FieldRow label="가까운 농지까지 거리">
                <NumberInput value={listing.farm.farmDistanceKm} onChange={(v) => set({ farm: { ...listing.farm, farmDistanceKm: v } })} suffix="km" step={0.1} />
              </FieldRow>
              <FieldRow label="차량 이동시간">
                <NumberInput value={listing.farm.farmTravelMinutes} onChange={(v) => set({ farm: { ...listing.farm, farmTravelMinutes: v } })} suffix="분" />
              </FieldRow>
              <FieldRow label="진입로 폭">
                <NumberInput value={listing.farm.roadWidthM} onChange={(v) => set({ farm: { ...listing.farm, roadWidthM: v } })} suffix="m" step={0.1} />
              </FieldRow>
              <FieldRow label="주차 가능 대수">
                <NumberInput value={listing.farm.parkingCount} onChange={(v) => set({ farm: { ...listing.farm, parkingCount: v } })} suffix="대" />
              </FieldRow>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="농지 임대·매매 연계 가능">
                <TriSelect value={listing.farm.farmLinkAvailable} onChange={(v) => set({ farm: { ...listing.farm, farmLinkAvailable: v } })} yesLabel="가능" noLabel="불가" />
              </FieldRow>
              <FieldRow label="1톤 트럭 진입">
                <TriSelect value={listing.farm.truckAccess} onChange={(v) => set({ farm: { ...listing.farm, truckAccess: v } })} yesLabel="가능" noLabel="어려움" />
              </FieldRow>
              <FieldRow label="소형 농기계 진입">
                <TriSelect value={listing.farm.machineAccess} onChange={(v) => set({ farm: { ...listing.farm, machineAccess: v } })} yesLabel="가능" noLabel="어려움" />
              </FieldRow>
              <FieldRow label="차량 회차 가능">
                <TriSelect value={listing.farm.turnaround} onChange={(v) => set({ farm: { ...listing.farm, turnaround: v } })} yesLabel="가능" noLabel="어려움" />
              </FieldRow>
              <FieldRow label="농산물·농기구 보관 가능">
                <TriSelect value={listing.farm.farmStorage} onChange={(v) => set({ farm: { ...listing.farm, farmStorage: v } })} yesLabel="가능" noLabel="불가" />
              </FieldRow>
              <FieldRow label="외부 수도">
                <TriSelect value={listing.farm.outdoorWater} onChange={(v) => set({ farm: { ...listing.farm, outdoorWater: v } })} yesLabel="있음" noLabel="없음" />
              </FieldRow>
              <FieldRow label="농작업 공간">
                <TriSelect value={listing.farm.workspace} onChange={(v) => set({ farm: { ...listing.farm, workspace: v } })} yesLabel="있음" noLabel="없음" />
              </FieldRow>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <CheckField checked={listing.farm.hasStorage} onChange={(v) => set({ farm: { ...listing.farm, hasStorage: v } })} label="창고 있음" />
                {listing.farm.hasStorage && (
                  <FieldRow label="창고 면적">
                    <NumberInput value={listing.farm.storageAreaM2} onChange={(v) => set({ farm: { ...listing.farm, storageAreaM2: v } })} suffix="㎡" />
                  </FieldRow>
                )}
              </div>
              <div className="space-y-3">
                <CheckField checked={listing.farm.hasYard} onChange={(v) => set({ farm: { ...listing.farm, hasYard: v } })} label="마당 있음" />
                {listing.farm.hasYard && (
                  <FieldRow label="마당 면적">
                    <NumberInput value={listing.farm.yardAreaM2} onChange={(v) => set({ farm: { ...listing.farm, yardAreaM2: v } })} suffix="㎡" />
                  </FieldRow>
                )}
              </div>
            </div>
            <FieldRow label="추가로 알리고 싶은 영농환경">
              <textarea rows={2} value={listing.farm.note} onChange={(e) => set({ farm: { ...listing.farm, note: e.target.value } })} className={inputCls} placeholder="수요자 화면 요약글로 사용돼요." />
            </FieldRow>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <p className="rounded-xl bg-sand/60 p-3.5 text-xs text-stone">확인되지 않은 항목은 “없음” 대신 “확인되지 않음”으로 남겨 주세요.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="상수도">
                <TriSelect value={listing.living.water} onChange={(v) => set({ living: { ...listing.living, water: v } })} yesLabel="연결됨" noLabel="없음" />
              </FieldRow>
              <FieldRow label="지하수">
                <TriSelect value={listing.living.groundwater} onChange={(v) => set({ living: { ...listing.living, groundwater: v } })} yesLabel="있음" noLabel="없음" />
              </FieldRow>
              <FieldRow label="전기">
                <TriSelect value={listing.living.electricity} onChange={(v) => set({ living: { ...listing.living, electricity: v } })} yesLabel="연결됨" noLabel="없음" />
              </FieldRow>
              <FieldRow label="보일러 작동 확인">
                <TriSelect value={listing.living.boilerChecked} onChange={(v) => set({ living: { ...listing.living, boilerChecked: v } })} yesLabel="작동 확인" noLabel="작동 안 함" />
              </FieldRow>
              <FieldRow label="인터넷 설치 가능">
                <TriSelect value={listing.living.internetAvailable} onChange={(v) => set({ living: { ...listing.living, internetAvailable: v } })} yesLabel="가능" noLabel="불가" />
              </FieldRow>
              <FieldRow label="정화조·하수도">
                <TriSelect value={listing.living.septic} onChange={(v) => set({ living: { ...listing.living, septic: v } })} yesLabel="정상" noLabel="문제 있음" />
              </FieldRow>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldRow label="난방방식">
                <TextInput value={listing.living.heatingType} onChange={(v) => set({ living: { ...listing.living, heatingType: v } })} placeholder="예: 기름보일러" />
              </FieldRow>
              <FieldRow label="쓰레기 배출 장소">
                <TextInput value={listing.living.wasteDisposal} onChange={(v) => set({ living: { ...listing.living, wasteDisposal: v } })} placeholder="예: 마을 클린하우스 도보 3분" />
              </FieldRow>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <FieldRow label="버스정류장">
                <NumberInput value={listing.living.busStopM} onChange={(v) => set({ living: { ...listing.living, busStopM: v } })} suffix="m" step={50} />
              </FieldRow>
              <FieldRow label="마트">
                <NumberInput value={listing.living.martKm} onChange={(v) => set({ living: { ...listing.living, martKm: v } })} suffix="km" step={0.5} />
              </FieldRow>
              <FieldRow label="병원·보건소">
                <NumberInput value={listing.living.hospitalKm} onChange={(v) => set({ living: { ...listing.living, hospitalKm: v } })} suffix="km" step={0.5} />
              </FieldRow>
              <FieldRow label="읍·면 중심지">
                <NumberInput value={listing.living.townCenterKm} onChange={(v) => set({ living: { ...listing.living, townCenterKm: v } })} suffix="km" step={0.5} />
              </FieldRow>
              <FieldRow label="인근 주택">
                <NumberInput value={listing.living.neighborM} onChange={(v) => set({ living: { ...listing.living, neighborM: v } })} suffix="m" step={5} />
              </FieldRow>
            </div>
            <FieldRow label="휴대전화 수신 상태">
              <div className="flex flex-wrap gap-1.5">
                {(['좋음', '보통', '약함', '확인되지 않음'] as const).map((v) => (
                  <button key={v} type="button" aria-pressed={listing.living.mobileSignal === v} onClick={() => set({ living: { ...listing.living, mobileSignal: v } })} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${listing.living.mobileSignal === v ? 'border-forest bg-forest text-white' : 'border-sand bg-white hover:border-forest/40'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </FieldRow>
            <FieldRow label="기타 생활환경">
              <textarea rows={2} value={listing.living.note} onChange={(e) => set({ living: { ...listing.living, note: e.target.value } })} className={inputCls} />
            </FieldRow>
          </div>
        )}

        {step === 5 && photos && (
          <div className="space-y-5">
            <div className="rounded-xl bg-tangerine-light/40 p-3.5 text-xs leading-relaxed">
              <p className="font-bold text-tangerine-dark">개인정보 안내</p>
              <p className="mt-1 text-basalt">
                사람 얼굴이 나온 사진, 신분증·계약서·우편물 등 개인정보가 보이는 사진은 등록하지 마세요. 전체 상세주소나
                소유자 연락처가 사진에 노출되지 않도록 확인해 주세요.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">사진 등록 완성도 — {photos.percent}%</p>
                <p className="text-xs text-stone">
                  {photos.covered.length}/{photos.required.length}개 분류 등록
                </p>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sand">
                <div className="h-full rounded-full bg-forest" style={{ width: `${photos.percent}%` }} />
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {PHOTO_CATEGORIES.map((c) => {
                  const has = photos.covered.includes(c)
                  const na = listing.photoNA.includes(c)
                  return (
                    <li key={c} className={`flex items-center justify-between gap-1 rounded-lg px-2.5 py-1.5 text-xs ${na ? 'bg-sand text-stone' : has ? 'bg-leaf text-forest-dark' : 'bg-tangerine-light/50 text-tangerine-dark'}`}>
                      <span className="font-medium">{c}</span>
                      {na ? (
                        <button type="button" onClick={() => toggleNA(c)} className="underline">해당 없음 취소</button>
                      ) : has ? (
                        '✓'
                      ) : NA_ALLOWED.includes(c) ? (
                        <button type="button" onClick={() => toggleNA(c)} className="underline">해당 공간 없음</button>
                      ) : (
                        '누락'
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>

            <div>
              <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-forest/40 bg-leaf/40 px-5 py-3 text-sm font-bold text-forest-dark hover:bg-leaf">
                <ImagePlus className="size-5" aria-hidden />
                사진 여러 장 업로드 (JPG·PNG·WebP, 최대 {MAX_FILE_MB}MB)
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = '' }} />
              <p className="mt-1.5 text-xs text-stone">
                형식·크기·해상도·중복 파일명은 단순 검증만 수행해요. 어두움·흔들림 등 AI 사진품질 분석은 수행하지 않습니다.
              </p>
            </div>

            <ul className="space-y-3">
              {listing.photos.map((p, idx) => {
                const url = previewUrls.get(p.id)
                return (
                  <li key={p.id} className="rounded-xl border border-sand p-3.5">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand text-center text-[10px] text-stone">
                        {url ? <img src={url} alt={`${p.category} 미리보기`} className="size-full object-cover" /> : p.isDemoImage ? '데모 이미지' : '미리보기 만료됨'}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={p.category} onChange={(e) => updatePhoto(p.id, { category: e.target.value as PhotoCategory })} className="rounded-lg border border-sand bg-white px-2 py-1.5 text-xs font-semibold" aria-label={`사진 ${idx + 1} 분류`}>
                            {PHOTO_CATEGORIES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <span className="truncate text-xs text-stone">{p.fileName}</span>
                          <button type="button" onClick={() => updatePhoto(p.id, { isPrimary: true })} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${p.isPrimary ? 'bg-tangerine text-white' : 'border border-sand text-stone hover:border-tangerine'}`}>
                            <Star className="size-3" aria-hidden />
                            {p.isPrimary ? '대표사진' : '대표로'}
                          </button>
                          <label className="inline-flex items-center gap-1 text-xs font-medium">
                            <input type="checkbox" checked={p.isPublic} onChange={(e) => updatePhoto(p.id, { isPublic: e.target.checked })} className="size-3.5 accent-[#658a65]" />
                            공개
                          </label>
                          <button type="button" onClick={() => removePhoto(p.id)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-sand px-2 py-1 text-xs text-stone hover:border-tangerine hover:text-tangerine-dark">
                            <Trash2 className="size-3" aria-hidden />
                            삭제
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input value={p.description} onChange={(e) => updatePhoto(p.id, { description: e.target.value })} placeholder="사진 설명 (예: 안방 모서리 곰팡이 의심 부위)" className="rounded-lg border border-sand bg-white px-2.5 py-1.5 text-xs" aria-label={`사진 ${idx + 1} 설명`} />
                          <input type="date" value={p.takenAt} onChange={(e) => updatePhoto(p.id, { takenAt: e.target.value })} className="rounded-lg border border-sand bg-white px-2.5 py-1.5 text-xs" aria-label={`사진 ${idx + 1} 촬영일`} />
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-xl border border-tangerine bg-tangerine-light/40 px-4 py-3 text-sm font-semibold text-tangerine-dark">
            {error}
          </p>
        )}
        {notice && !error && (
          <p role="status" className="mt-5 rounded-xl bg-leaf px-4 py-3 text-sm font-medium text-forest-dark">
            {notice}
          </p>
        )}

        <div className="mt-7 flex items-center justify-between gap-3">
          <button type="button" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0} className="inline-flex items-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-4 py-2.5 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40 disabled:cursor-not-allowed disabled:border-0 disabled:bg-tangerine-light disabled:text-white">
            <ArrowLeft className="size-4" aria-hidden />
            이전
          </button>
          <button type="button" onClick={goNext} className="inline-flex items-center gap-1.5 rounded-xl bg-tangerine px-5 py-2.5 text-sm font-bold text-white hover:bg-tangerine-sub">
            {step === STEPS.length - 1 ? '저장하고 AI 분석으로' : '저장 후 다음'}
            <ArrowRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
