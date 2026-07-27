import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HouseImage } from '../components/HouseImage'
import { BoolMark, ErrorState, SkeletonCard, TriStateMark } from '../components/ui'
import { useHouses } from '../hooks/useHouses'
import { loadConditions } from '../repositories/conditionsRepository'
import { calcRepairRange } from '../services/cost'
import { rankHouses } from '../services/scoring'
import type { RankedHouse } from '../types'
import { trackEvent } from '../utils/analytics'
import { manwon, manwonRange } from '../utils/format'

function Row({ label, render, ranked }: { label: string; render: (r: RankedHouse) => React.ReactNode; ranked: RankedHouse[] }) {
  return (
    <tr className="border-t border-sand align-top">
      <th
        scope="row"
        className="sticky left-0 z-10 min-w-32 bg-white px-3 py-3 text-left text-xs font-semibold text-stone sm:min-w-40 sm:text-sm"
      >
        {label}
      </th>
      {ranked.map((r) => (
        <td key={r.house.id} className="min-w-44 px-3 py-3 text-sm sm:min-w-52">
          {render(r)}
        </td>
      ))}
    </tr>
  )
}

function ListCell({ items, empty = '—' }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <span className="text-stone">{empty}</span>
  return (
    <ul className="space-y-1 text-xs leading-relaxed sm:text-sm">
      {items.map((item) => (
        <li key={item}>· {item}</li>
      ))}
    </ul>
  )
}

export default function Compare() {
  const navigate = useNavigate()
  const conditions = useMemo(() => loadConditions(), [])
  const { houses, loading } = useHouses()

  useEffect(() => {
    if (conditions) trackEvent('comparison_viewed')
  }, [conditions])

  if (!conditions) {
    return (
      <ErrorState
        title="먼저 조건을 입력해 주세요"
        message="비교 기준이 되는 조건이 없어요. 조건을 입력하면 세 집을 같은 기준으로 비교해 드려요."
        onRetry={() => navigate('/conditions')}
        retryLabel="조건 입력하러 가기"
      />
    )
  }

  if (loading || !houses) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  const ranked = rankHouses(houses, conditions)

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">세 집 비교</h1>
      <p className="mt-1.5 text-sm text-stone">
        같은 기준으로 세 빈집을 비교했어요. 금액과 분석 결과는 참고 범위이며, 계약 전 현장점검이 필요합니다.
      </p>
      <p className="mt-1 text-xs text-stone sm:hidden">← 표를 옆으로 밀어 세 집을 모두 확인하세요.</p>

      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-sand">
        <table className="w-full border-collapse">
          <caption className="sr-only">빈집 3채 비교표</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-32 bg-white px-3 py-3 sm:min-w-40">
                <span className="sr-only">비교 항목</span>
              </th>
              {ranked.map((r) => (
                <th key={r.house.id} scope="col" className="min-w-44 px-3 py-3 text-left sm:min-w-52">
                  <div className="overflow-hidden rounded-lg">
                    <HouseImage houseId={r.house.id} className="h-20 w-full" showDemoBadge={false} />
                  </div>
                  <p className="mt-2 text-sm font-extrabold">{r.house.name}</p>
                  <p className="text-xs font-normal text-stone">{r.house.region}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row
              ranked={ranked}
              label="적합도 순위"
              render={(r) => (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                    r.rank === 1 ? 'bg-tangerine text-white' : 'bg-sand text-basalt'
                  }`}
                >
                  {r.rank}순위 · {r.score.total}점
                </span>
              )}
            />
            <Row ranked={ranked} label="보증금" render={(r) => <strong>{manwon(r.house.deposit)}</strong>} />
            <Row ranked={ranked} label="월 임대료" render={(r) => manwon(r.house.monthlyRent)} />
            <Row
              ranked={ranked}
              label="예상 수리비 (참고)"
              render={(r) => {
                const range = calcRepairRange(r.house.repairItems)
                return manwonRange(range.min, range.max)
              }}
            />
            <Row
              ranked={ranked}
              label="초기 주거비 (참고)"
              render={(r) => <strong>{manwonRange(r.score.initialCost.min, r.score.initialCost.max)}</strong>}
            />
            <Row
              ranked={ranked}
              label="농지까지 이동시간"
              render={(r) => `${r.house.farmTravelMinutes}분 (${r.house.farmDistanceKm}km)`}
            />
            <Row ranked={ranked} label="1톤 트럭 진입" render={(r) => <TriStateMark state={r.house.truckAccess} />} />
            <Row ranked={ranked} label="주차" render={(r) => <TriStateMark state={r.house.parking} />} />
            <Row ranked={ranked} label="창고" render={(r) => <BoolMark value={r.house.hasStorage} />} />
            <Row ranked={ranked} label="마당" render={(r) => <BoolMark value={r.house.hasYard} />} />
            <Row ranked={ranked} label="수도" render={(r) => <TriStateMark state={r.house.utilities.water} />} />
            <Row ranked={ranked} label="전기" render={(r) => <TriStateMark state={r.house.utilities.electricity} />} />
            <Row ranked={ranked} label="난방" render={(r) => <TriStateMark state={r.house.utilities.heating} />} />
            <Row ranked={ranked} label="인터넷" render={(r) => <TriStateMark state={r.house.utilities.internet} />} />
            <Row
              ranked={ranked}
              label="사진에서 확인된 주요 수리항목"
              render={(r) => <ListCell items={r.house.repairItems.map((item) => item.name)} empty="확인된 항목 없음" />}
            />
            <Row
              ranked={ranked}
              label="현장 확인이 필요한 항목"
              render={(r) => <ListCell items={[...r.house.unknownFromPhotos, ...r.score.siteCheckNeeded].slice(0, 5)} />}
            />
            <Row
              ranked={ranked}
              label="내 조건과 일치"
              render={(r) => <ListCell items={r.score.matched.slice(0, 5)} empty="일치 항목 없음" />}
            />
            <Row
              ranked={ranked}
              label="내 조건과 불일치"
              render={(r) => <ListCell items={r.score.mismatched.slice(0, 5)} empty="불일치 항목 없음" />}
            />
            <tr className="border-t border-sand">
              <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-3">
                <span className="sr-only">바로가기</span>
              </th>
              {ranked.map((r) => (
                <td key={r.house.id} className="px-3 py-3">
                  <div className="flex flex-col gap-2">
                    <Link
                      to={`/houses/${r.house.id}`}
                      className="rounded-lg border border-tangerine-sub bg-white px-3 py-2 text-center text-xs font-bold text-tangerine-dark hover:bg-tangerine-light/40 focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
                    >
                      이 집 자세히 보기
                    </Link>
                    <Link
                      to={`/visit/${r.house.id}`}
                      className="rounded-lg bg-tangerine px-3 py-2 text-center text-xs font-bold text-white hover:bg-tangerine-sub focus:outline-2 focus:outline-offset-2 focus:outline-tangerine-sub"
                    >
                      방문 신청
                    </Link>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
