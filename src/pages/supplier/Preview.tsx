import { ArrowLeft, CircleCheck, CircleX, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HouseImage } from '../../components/HouseImage'
import { ErrorState, LevelBadge, SafetyNotice, TriStateMark } from '../../components/ui'
import { getListingById, setListingStatus } from '../../repositories/listingsRepository'
import { loadSupplierProfile } from '../../repositories/supplierSessionRepository'
import { canPublish, publishChecklist } from '../../services/publication'
import { toPublicHouse } from '../../services/privacy'
import { estimateTotals } from '../../services/repair-cost'
import type { HouseListing } from '../../types/supplier'
import { trackEvent } from '../../utils/analytics'
import { manwonRange } from '../../utils/format'

export default function SupplierPreview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const actor = loadSupplierProfile()?.type ?? '공급자'
  const [listing, setListing] = useState<HouseListing | null>(() => (id ? getListingById(id) : null))
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (listing) trackEvent('listing_previewed', listing.id, actor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!listing) {
    return (
      <ErrorState
        title="빈집을 찾을 수 없어요"
        message="주소가 잘못되었거나 삭제된 매물이에요."
        onRetry={() => navigate('/supplier/listings')}
        retryLabel="목록으로 돌아가기"
      />
    )
  }

  const checklist = publishChecklist(listing)
  const check = canPublish(listing)
  const house = toPublicHouse(listing)
  const totals = estimateTotals(listing.estimate?.items ?? [])

  const publish = () => {
    if (!check.ok) return
    setListingStatus(listing.id, 'published', actor, '미리보기에서 공개 처리')
    trackEvent('listing_published', listing.id, actor)
    setListing({ ...listing, status: 'published' })
    setNotice('공개했어요! 이제 수요자 화면의 추천·비교에서 이 매물을 볼 수 있어요.')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to={`/supplier/listings/${listing.id}/analysis`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone hover:text-forest">
        <ArrowLeft className="size-4" aria-hidden />
        분석·검토로
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight">공개 전 미리보기 — {listing.basic.name}</h1>
      <p className="mt-1 text-sm text-stone">수요자 화면에 보이는 모습이에요. 민감정보(소유자·상세주소·내부 메모)는 포함되지 않아요.</p>

      {/* 공개 전 체크리스트 */}
      <section className="mt-5 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
        <h2 className="font-bold">공개 전 체크리스트</h2>
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {checklist.map((c) => (
            <li key={c.key} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${c.ok ? 'bg-leaf/60' : 'bg-tangerine-light/40'}`}>
              {c.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden /> : <CircleX className="mt-0.5 size-4 shrink-0 text-tangerine-dark" aria-hidden />}
              <span>
                <span className="font-medium">{c.label}</span>
                {!c.ok && c.hint && <span className="mt-0.5 block text-xs text-stone">{c.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={publish}
            disabled={!check.ok || listing.status === 'published'}
            className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-forest-dark disabled:cursor-not-allowed disabled:bg-tangerine-light disabled:text-white"
          >
            <Globe className="size-4" aria-hidden />
            {listing.status === 'published' ? '공개 중' : '이 매물 공개하기'}
          </button>
          {!check.ok && <p className="text-xs font-medium text-tangerine-dark">{check.failures.length}개 항목이 완료되지 않아 공개할 수 없어요.</p>}
        </div>
        {notice && (
          <p role="status" className="mt-3 rounded-xl bg-leaf px-4 py-3 text-sm font-medium text-forest-dark">
            {notice}
          </p>
        )}
      </section>

      {/* 수요자 화면 미리보기 */}
      <section className="mt-5 rounded-2xl border-2 border-dashed border-forest/30 bg-cream p-5">
        <p className="mb-3 text-xs font-bold text-forest-dark">▼ 수요자 화면 미리보기</p>
        <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-sand">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-extrabold">{house.name}</h3>
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-stone">MVP 시연용 가상 매물</span>
          </div>
          <p className="mt-0.5 text-sm text-stone">
            {house.region} · {house.areaM2}㎡ · {house.builtYear}년 · 보증금 {house.deposit.toLocaleString()} / 월세 {house.monthlyRent}만 원
          </p>
          <div className="mt-3 overflow-hidden rounded-xl">
            <HouseImage houseId={house.id} label={house.photos[0]?.label ?? '대표사진'} className="h-44 w-full" />
          </div>
          <p className="mt-1 text-xs text-stone">공개 사진 {house.photos.length}장 · 공개 위치: {house.region} ({listing.basic.addressDisclosure})</p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-stone">농지까지</dt>
              <dd className="font-semibold">{house.farmTravelMinutes}분 ({house.farmDistanceKm}km)</dd>
            </div>
            <div>
              <dt className="text-xs text-stone">1톤 트럭 진입</dt>
              <dd><TriStateMark state={house.truckAccess} /></dd>
            </div>
            <div>
              <dt className="text-xs text-stone">주차</dt>
              <dd><TriStateMark state={house.parking} /></dd>
            </div>
            <div>
              <dt className="text-xs text-stone">창고</dt>
              <dd className="font-semibold">{house.hasStorage ? house.storageNote : '없음'}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone">마당</dt>
              <dd className="font-semibold">{house.hasYard ? house.yardNote : '없음'}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone">수리 부담</dt>
              <dd><LevelBadge level={house.repairBurden} /></dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="text-sm font-bold">사진 기반 상태 분석 {listing.analysis?.isDemo && <span className="ml-1 rounded-full bg-tangerine-light px-2 py-0.5 text-[11px] font-semibold text-tangerine-dark">데모 분석</span>}</p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {house.photoAnalysis.map((a) => (
                <li key={a.part} className="rounded-lg bg-sand/50 px-3 py-2">
                  <span className="font-semibold">{a.part}</span> — {a.observation}
                  {a.needsSiteCheck && <span className="ml-1 text-xs font-semibold text-tangerine-dark">현장 확인 필요</span>}
                </li>
              ))}
              {house.photoAnalysis.length === 0 && <li className="text-stone">공개할 분석 결과가 없어요.</li>}
            </ul>
          </div>

          <div className="mt-4 rounded-xl bg-leaf/60 p-4 text-sm">
            <p className="font-bold">예상 수리비 (참고): {manwonRange(totals.min, totals.max)}</p>
            {totals.siteQuoteItems.length > 0 && (
              <p className="mt-1 text-xs text-stone">현장견적 필요: {totals.siteQuoteItems.join(', ')} (합산 제외)</p>
            )}
            <p className="mt-1 text-xs text-stone">확인되지 않은 정보: {house.unknownFromPhotos.join(' · ') || '없음'}</p>
          </div>

          <SafetyNotice className="mt-4" />
        </div>
      </section>
    </div>
  )
}
