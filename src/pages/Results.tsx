import { AlertTriangle, ArrowRight, CircleHelp, ClipboardList, Scale, ThumbsUp } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { HouseImage } from '../components/HouseImage'
import { BoolMark, ErrorState, SkeletonCard, TriStateMark } from '../components/ui'
import { useHouses } from '../hooks/useHouses'
import { loadConditions } from '../repositories/conditionsRepository'
import { rankHouses, SCORE_WEIGHTS } from '../services/scoring'
import { calcRepairRange } from '../services/cost'
import type { RankedHouse } from '../types'
import { trackEvent } from '../utils/analytics'
import { manwonRange } from '../utils/format'

function ScoreExplainer() {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-stone underline decoration-dotted underline-offset-2 hover:text-forest [&::-webkit-details-marker]:hidden">
        <CircleHelp className="size-3.5" aria-hidden />
        점수 기준
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl bg-basalt p-4 text-xs leading-relaxed text-cream shadow-lg">
        <p className="font-bold">적합도 점수 산정 기준 (총 100점)</p>
        <ul className="mt-2 space-y-1">
          {SCORE_WEIGHTS.map((w) => (
            <li key={w.key} className="flex justify-between gap-2">
              <span>{w.label}</span>
              <span className="font-semibold">{w.max}점</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-cream/80">
          입력한 조건과 매물 정보를 대조한 규칙 기반 점수예요. 절대적 평가가 아닌 방문 우선순위 참고용입니다.
        </p>
      </div>
    </details>
  )
}

function ResultCard({ ranked }: { ranked: RankedHouse }) {
  const { house, score, rank } = ranked
  const isTop = rank === 1
  const repair = calcRepairRange(house.repairItems)

  return (
    <article
      className={`rounded-2xl bg-white shadow-soft ring-1 ${
        isTop ? 'ring-2 ring-tangerine' : 'ring-sand'
      }`}
      aria-label={`${rank}순위 ${house.name}`}
    >
      {isTop && (
        <p className="rounded-t-2xl bg-tangerine px-5 py-2 text-sm font-bold text-white">
          1순위 · 먼저 방문해 보세요
        </p>
      )}
      <div className="p-5">
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="w-full shrink-0 overflow-hidden rounded-xl sm:w-56">
            <HouseImage houseId={house.id} label={house.photos[0]?.label} className="h-40 w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-stone">
                  {rank}순위 · {house.region} · {house.areaM2}㎡
                </p>
                <h2 className="mt-0.5 text-lg font-extrabold">{house.name}</h2>
                <p className="mt-0.5 text-sm text-stone">
                  보증금 {house.deposit.toLocaleString()} / 월세 {house.monthlyRent}만 원
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className={`text-2xl font-extrabold ${isTop ? 'text-tangerine-dark' : 'text-forest'}`}>
                    {score.total}
                  </span>
                  <span className="text-sm text-stone">/ 100</span>
                </div>
                <ScoreExplainer />
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-stone">수리 부담</dt>
                <dd className="font-semibold">{house.repairBurden}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone">예상 수리비(참고)</dt>
                <dd className="font-semibold">{manwonRange(repair.min, repair.max)}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone">예상 초기 주거비(참고)</dt>
                <dd className="font-semibold">{manwonRange(score.initialCost.min, score.initialCost.max)}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone">농지까지</dt>
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
              <div className="flex gap-3">
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
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-leaf/70 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-forest-dark">
              <ThumbsUp className="size-3.5" aria-hidden />
              추천 이유
            </p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {score.reasons.map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl bg-tangerine-light/70 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold text-tangerine-dark">
              <AlertTriangle className="size-3.5" aria-hidden />
              주의할 점
            </p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {(score.cautions.length > 0 ? score.cautions : ['특별한 주의사항은 확인되지 않았어요. 현장점검은 꼭 필요해요.']).map((r) => (
                <li key={r}>· {r}</li>
              ))}
            </ul>
          </div>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-stone underline decoration-dotted underline-offset-2 hover:text-forest">
            점수 세부내역 보기
          </summary>
          <ul className="mt-2 space-y-1.5 rounded-xl bg-sand/50 p-3.5 text-sm">
            {score.breakdown.map((b) => (
              <li key={b.key} className="flex flex-wrap justify-between gap-x-3">
                <span>
                  {b.label} <span className="text-xs text-stone">— {b.detail}</span>
                </span>
                <span className="font-semibold">
                  {b.score} / {b.max}
                </span>
              </li>
            ))}
          </ul>
        </details>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Link
            to={`/houses/${house.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-tangerine px-4 py-2.5 text-sm font-bold text-white hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
          >
            상세 분석 보기
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            to="/compare"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-tangerine-sub bg-white px-4 py-2.5 text-sm font-bold text-tangerine-dark hover:bg-tangerine-light/40 focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
          >
            <Scale className="size-4" aria-hidden />세 집 비교하기
          </Link>
        </div>
      </div>
    </article>
  )
}

export default function Results() {
  const conditions = useMemo(() => loadConditions(), [])
  const { houses, loading } = useHouses()

  useEffect(() => {
    if (conditions) trackEvent('recommendation_viewed')
  }, [conditions])

  if (!conditions) {
    return (
      <ErrorState
        title="먼저 조건을 입력해 주세요"
        message="입력된 영농·생활·예산 조건이 없어요. 조건을 입력하면 빈집 3채의 방문 우선순위를 정리해 드려요."
        onRetry={() => {
          window.location.href = '/conditions'
        }}
        retryLabel="조건 입력하러 가기"
      />
    )
  }

  const ranked = houses ? rankHouses(houses, conditions) : []

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">추천 결과</h1>
          <p className="mt-1.5 text-sm font-medium text-basalt">입력한 조건을 바탕으로 방문 우선순위를 정리했어요.</p>
          <p className="text-xs text-stone">정확한 상태와 견적은 계약 전 현장점검이 필요합니다.</p>
        </div>
        <Link
          to="/conditions"
          className="inline-flex items-center gap-1.5 rounded-xl border border-sand bg-white px-3.5 py-2 text-sm font-semibold hover:border-forest/40 focus:outline-2 focus:outline-offset-2 focus:outline-forest"
        >
          <ClipboardList className="size-4" aria-hidden />
          조건 수정
        </Link>
      </div>

      <div className="mt-6 space-y-5">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          ranked.map((r) => <ResultCard key={r.house.id} ranked={r} />)
        )}
      </div>
    </div>
  )
}
