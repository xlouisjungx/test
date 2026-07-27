import { AlertTriangle, ArrowLeft, CalendarCheck, Check, CircleHelp, ThumbsUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { HouseImage } from '../components/HouseImage'
import { BoolMark, ErrorState, LevelBadge, SectionCard, SkeletonCard, TriStateMark } from '../components/ui'
import { useHouse } from '../hooks/useHouses'
import { loadChecklist, saveChecklist } from '../repositories/checklistRepository'
import { loadConditions } from '../repositories/conditionsRepository'
import { calcRepairRange, INITIAL_COST_EXCLUSIONS } from '../services/cost'
import { scoreHouse } from '../services/scoring'
import { HOUSE_PHOTO_FILES } from '../data/housePhotos'
import { COMMON_SITE_CHECKS } from '../data/siteChecks'
import { trackEvent } from '../utils/analytics'
import { manwon, manwonRange, pyeong } from '../utils/format'

export default function HouseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { house, loading } = useHouse(id)
  const conditions = useMemo(() => loadConditions(), [])
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (house) {
      trackEvent('house_detail_viewed', house.id)
      setChecked(loadChecklist(house.id))
    }
  }, [house])

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!house) {
    return (
      <ErrorState
        title="빈집을 찾을 수 없어요"
        message="주소가 잘못되었거나 더 이상 등록되지 않은 매물이에요. 추천 결과에서 다시 선택해 주세요."
        onRetry={() => navigate('/results')}
        retryLabel="추천 결과로 돌아가기"
      />
    )
  }

  const score = conditions ? scoreHouse(house, conditions) : null
  const repair = calcRepairRange(house.repairItems)
  const realPhotoCount = HOUSE_PHOTO_FILES[house.id]?.length ?? 0
  const checklistItems = [...COMMON_SITE_CHECKS, ...house.extraSiteChecks]

  const toggleCheck = (item: string) => {
    const next = { ...checked, [item]: !checked[item] }
    setChecked(next)
    saveChecklist(house.id, next)
  }

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <Link
        to="/results"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-stone hover:text-forest focus:outline-2 focus:outline-offset-2 focus:outline-forest"
      >
        <ArrowLeft className="size-4" aria-hidden />
        추천 결과로
      </Link>

      {/* 기본정보 */}
      <section className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold tracking-tight">{house.name}</h1>
          <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-stone">
            MVP 시연용 가상 매물
          </span>
        </div>
        <p className="mt-1 text-sm text-stone">{house.summary}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className={`overflow-hidden rounded-2xl ${realPhotoCount <= 1 ? 'sm:col-span-2' : ''}`}>
            <HouseImage houseId={house.id} label={house.photos[0]?.label} className="h-56 w-full sm:h-72" />
          </div>
          {realPhotoCount > 1 && (
            <div className={`grid gap-2 ${realPhotoCount - 1 === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {Array.from({ length: realPhotoCount - 1 }, (_, idx) => (
                <div key={idx} className="overflow-hidden rounded-xl">
                  <HouseImage
                    houseId={house.id}
                    label={house.photos[idx + 1]?.label}
                    photoIndex={idx + 1}
                    className={realPhotoCount - 1 === 1 ? 'h-56 w-full sm:h-72' : 'h-28 w-full sm:h-[140px]'}
                    showDemoBadge={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white p-5 text-sm shadow-sm ring-1 ring-sand sm:grid-cols-4">
          <div>
            <dt className="text-xs text-stone">위치</dt>
            <dd className="font-bold">{house.region}</dd>
          </div>
          <div>
            <dt className="text-xs text-stone">주택면적</dt>
            <dd className="font-bold">
              {house.areaM2}㎡ (약 {pyeong(house.areaM2)}평)
            </dd>
          </div>
          <div>
            <dt className="text-xs text-stone">건축연도</dt>
            <dd className="font-bold">{house.builtYear}년</dd>
          </div>
          <div>
            <dt className="text-xs text-stone">임대조건</dt>
            <dd className="font-bold">
              {house.deposit.toLocaleString()} / {house.monthlyRent}만 원
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 space-y-6">
        {/* 사용자 적합도 */}
        {score && conditions ? (
          <SectionCard title="내 조건 적합도" description="입력한 조건과 이 집의 정보를 대조한 규칙 기반 점수예요.">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-forest">{score.total}</span>
              <span className="text-stone">/ 100점</span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {score.breakdown.map((b) => (
                <li key={b.key}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{b.label}</span>
                    <span className="font-semibold">
                      {b.score} / {b.max}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand" role="presentation">
                    <div className="h-full rounded-full bg-forest" style={{ width: `${(b.score / b.max) * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs text-stone">{b.detail}</p>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-leaf/70 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-bold text-forest-dark">
                  <Check className="size-3.5" aria-hidden />내 조건과 잘 맞아요
                </p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {(score.matched.length > 0 ? score.matched : ['일치 항목이 확인되지 않았어요']).map((m) => (
                    <li key={m}>· {m}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-tangerine-light/70 p-3.5">
                <p className="flex items-center gap-1.5 text-xs font-bold text-tangerine-dark">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  맞지 않거나 확인이 필요해요
                </p>
                <ul className="mt-1.5 space-y-1 text-sm">
                  {[...score.mismatched, ...score.siteCheckNeeded.map((s) => `${s} — 현장 확인 필요`)].slice(0, 6).map((m) => (
                    <li key={m}>· {m}</li>
                  ))}
                  {score.mismatched.length === 0 && score.siteCheckNeeded.length === 0 && <li>· 확인된 항목이 없어요</li>}
                </ul>
              </div>
            </div>

            {score.reasons.length > 0 && (
              <p className="mt-4 flex items-start gap-1.5 text-sm">
                <ThumbsUp className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
                <span>
                  <strong>추천 이유:</strong> {score.reasons.join(' · ')}
                </span>
              </p>
            )}
            {score.cautions.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-tangerine-dark" aria-hidden />
                <span>
                  <strong>주의사항:</strong> {score.cautions.join(' · ')}
                </span>
              </p>
            )}
          </SectionCard>
        ) : (
          <SectionCard title="내 조건 적합도" description="조건을 입력하면 이 집이 내 조건과 얼마나 맞는지 계산해 드려요.">
            <Link
              to="/conditions"
              className="inline-flex rounded-xl bg-tangerine px-4 py-2.5 text-sm font-bold text-white hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
            >
              내 조건 입력하기
            </Link>
          </SectionCard>
        )}

        {/* 사진 기반 상태 분석 */}
        <SectionCard
          title="사진 기반 상태 분석"
          description="공급자가 등록한 사진에서 확인 가능한 범위의 참고정보예요. 하자를 확정하는 진단이 아닙니다."
        >
          <ul className="space-y-3">
            {house.photoAnalysis.map((item) => (
              <li key={item.part} className="rounded-xl border border-sand p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{item.part}</span>
                  <LevelBadge level={item.burden} prefix="부담" />
                  <span className="rounded-full bg-sand px-2 py-0.5 text-[11px] font-medium text-stone">
                    사진 {item.photoConfidence}
                  </span>
                  {item.needsSiteCheck && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-tangerine-light px-2 py-0.5 text-[11px] font-semibold text-tangerine-dark">
                      <CircleHelp className="size-3" aria-hidden />
                      현장 확인 필요
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm">{item.observation}</p>
                <p className="mt-1 text-xs text-stone">
                  수리 필요 가능성 {item.repairLikelihood} · {item.note}
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-sand/60 p-4">
            <p className="text-xs font-bold text-stone">사진만으로 확인할 수 없는 항목</p>
            <p className="mt-1 text-sm">{house.unknownFromPhotos.join(' · ')}</p>
            <p className="mt-1.5 text-xs text-stone">
              위 항목은 “이상 없음”이 아니라 “판단할 수 없음”이에요. 현장점검에서 꼭 확인해 주세요.
            </p>
          </div>
        </SectionCard>

        {/* 예상 수리비 */}
        <SectionCard title="예상 수리비 (참고 범위)" description={house.utilityNote}>
          <table className="w-full text-sm">
            <caption className="sr-only">수리항목별 참고 비용</caption>
            <thead>
              <tr className="border-b border-sand text-left text-xs text-stone">
                <th scope="col" className="py-2 font-semibold">
                  수리항목
                </th>
                <th scope="col" className="py-2 font-semibold">
                  산정 기준
                </th>
                <th scope="col" className="py-2 text-right font-semibold">
                  참고 비용
                </th>
              </tr>
            </thead>
            <tbody>
              {house.repairItems.map((item) => (
                <tr key={item.name} className="border-b border-sand/60">
                  <th scope="row" className="py-2.5 pr-2 text-left font-medium">
                    {item.name}
                  </th>
                  <td className="py-2.5 pr-2 text-xs text-stone">{item.basis}</td>
                  <td className="py-2.5 text-right font-semibold whitespace-nowrap">
                    {manwonRange(item.minCost, item.maxCost)}
                  </td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="py-3 text-left font-bold">
                  총 예상 수리비
                </th>
                <td />
                <td className="py-3 text-right text-base font-extrabold text-forest whitespace-nowrap">
                  {manwonRange(repair.min, repair.max)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 rounded-xl bg-leaf/60 p-4 text-sm">
            <p className="font-bold">주거 관련 초기비용 (참고)</p>
            <p className="mt-1">
              보증금 {manwon(house.deposit)} + 예상 수리비 = <strong>{manwonRange(house.deposit + repair.min, house.deposit + repair.max)}</strong>
            </p>
            <p className="mt-1 text-xs text-stone">월 임대료 {manwon(house.monthlyRent)}는 별도예요.</p>
            <p className="mt-2 text-xs text-stone">
              포함되지 않는 비용: {INITIAL_COST_EXCLUSIONS.join(', ')}
            </p>
          </div>

          <p className="mt-3 rounded-xl border border-tangerine/40 bg-tangerine-light/50 p-3.5 text-xs leading-relaxed text-basalt">
            예상 수리비는 사진에서 확인된 항목과 사전 단가표를 이용한 참고 범위입니다. 실제 공사범위와 견적은
            전문가의 현장점검에 따라 달라질 수 있습니다.
          </p>
        </SectionCard>

        {/* 영농·생활 적합성 */}
        <SectionCard title="영농·생활 적합성">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-stone">농지까지 이동시간</dt>
              <dd className="font-semibold">
                {house.farmTravelMinutes}분 ({house.farmDistanceKm}km)
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">1톤 트럭 진입</dt>
              <dd>
                <TriStateMark state={house.truckAccess} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">소형 농기계 진입</dt>
              <dd>
                <TriStateMark state={house.machineAccess} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">주차</dt>
              <dd>
                <TriStateMark state={house.parking} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">창고</dt>
              <dd>
                <BoolMark value={house.hasStorage} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">마당</dt>
              <dd>
                <BoolMark value={house.hasYard} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">수도</dt>
              <dd>
                <TriStateMark state={house.utilities.water} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">전기</dt>
              <dd>
                <TriStateMark state={house.utilities.electricity} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">난방</dt>
              <dd>
                <TriStateMark state={house.utilities.heating} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">인터넷</dt>
              <dd>
                <TriStateMark state={house.utilities.internet} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone">대중교통</dt>
              <dd className="font-semibold">{house.transitAccess}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone">생활시설 접근성</dt>
              <dd className="font-semibold">{house.amenityAccess}</dd>
            </div>
          </dl>
          <div className="mt-4 space-y-1.5 text-xs text-stone">
            <p>· 진입: {house.truckAccessNote}</p>
            <p>· 주차: {house.parkingNote}</p>
            <p>· 창고: {house.storageNote}</p>
            <p>· 마당: {house.yardNote}</p>
          </div>
        </SectionCard>

        {/* 현장점검 체크리스트 */}
        <SectionCard
          title="현장점검 체크리스트"
          description="사진만으로 판단할 수 없는 항목이에요. 방문할 때 하나씩 확인해 보세요. 체크 상태는 이 브라우저에 저장돼요."
        >
          <ul className="space-y-2">
            {checklistItems.map((item) => (
              <li key={item}>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-sand px-3.5 py-3 hover:border-forest/40">
                  <input
                    type="checkbox"
                    checked={!!checked[item]}
                    onChange={() => toggleCheck(item)}
                    className="mt-0.5 size-4 accent-[#2e5b3f]"
                  />
                  <span className={`text-sm ${checked[item] ? 'text-stone line-through' : ''}`}>{item}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-stone">
            {Object.values(checked).filter(Boolean).length} / {checklistItems.length}개 확인함
          </p>
        </SectionCard>
      </div>

      {/* 고정 방문 신청 버튼 */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand bg-white/95 p-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <Link
            to={`/visit/${house.id}`}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-tangerine px-5 py-3.5 text-base font-extrabold text-white shadow-soft hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-dark"
          >
            <CalendarCheck className="size-5" aria-hidden />이 집 방문 신청하기
          </Link>
        </div>
      </div>
    </div>
  )
}
