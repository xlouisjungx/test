import { MapPin, Ruler, Truck, Warehouse, Droplets, AlertTriangle, ClipboardCheck } from 'lucide-react'
import type { PublicListing } from '../types'
import {
  BURDEN_META,
  CONFIDENCE_LABEL,
  LIKELIHOOD_LABEL,
  LIVABLE_LABEL,
  REPAIR_ITEM_LABEL,
  SUFFICIENCY_LABEL,
  TRANSACTION_TYPE_LABEL,
  TRI_LABEL,
} from '../data/constants'
import { Card, DemoBadge } from './ui'

function money(n?: number): string {
  return n == null ? '-' : `${n.toLocaleString('ko-KR')}만 원`
}

function priceLine(t: PublicListing['transaction']): string {
  switch (t.type) {
    case 'monthly':
      return `보증금 ${money(t.depositManwon)} / 월 ${money(t.monthlyRentManwon)}`
    case 'jeonse':
      return `전세 ${money(t.depositManwon)}`
    case 'sale':
      return `매매 ${money(t.salePriceManwon)}`
    case 'public_rent':
      return `공공임대 · 보증금 ${money(t.depositManwon)} / 월 ${money(t.monthlyRentManwon)}`
    case 'negotiable':
      return '조건 협의'
  }
}

/** 수요자 사이드에서 보이는 매물 상세와 동일한 형태의 뷰 */
export default function PublicListingView({ listing }: { listing: PublicListing }) {
  const primary = listing.photos.find((p) => p.isPrimary) ?? listing.photos[0]
  const rest = listing.photos.filter((p) => p.id !== primary?.id)

  return (
    <div className="space-y-5">
      <div>
        {primary?.dataUrl ? (
          <img src={primary.dataUrl} alt={primary.caption ?? '대표사진'} className="h-56 w-full rounded-xl object-cover sm:h-72" />
        ) : (
          <div className="flex h-56 items-center justify-center rounded-xl bg-sand-100 text-sm text-basalt-500">대표사진 없음</div>
        )}
        {rest.length > 0 && (
          <div className="mt-2 flex gap-2 overflow-x-auto">
            {rest.map((p) => (
              <img key={p.id} src={p.dataUrl} alt={p.caption ?? ''} className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[28px] font-bold leading-tight text-basalt-900">{listing.name}</h1>
          {listing.isDemo && <DemoBadge />}
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-basalt-500">
          <MapPin className="h-4 w-4" aria-hidden /> {listing.publicAddress}
        </p>
        <p className="mt-2 text-lg font-semibold text-pine-700">
          {TRANSACTION_TYPE_LABEL[listing.transaction.type]} · {priceLine(listing.transaction)}
        </p>
        {listing.transaction.priceNegotiable && <p className="text-xs text-basalt-500">가격 협의 가능</p>}
      </div>

      <Card>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-basalt-900">
          <Ruler className="h-4 w-4 text-pine-600" aria-hidden /> 기본정보
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          <div><dt className="text-basalt-500">주택유형</dt><dd>{listing.houseType}</dd></div>
          <div><dt className="text-basalt-500">연면적</dt><dd>{listing.floorAreaM2 ?? '-'}㎡</dd></div>
          <div><dt className="text-basalt-500">대지면적</dt><dd>{listing.landAreaM2 ?? '-'}㎡</dd></div>
          <div><dt className="text-basalt-500">건축연도</dt><dd>{listing.builtYear ?? '-'}</dd></div>
          <div><dt className="text-basalt-500">방/화장실</dt><dd>{listing.rooms ?? '-'} / {listing.baths ?? '-'}</dd></div>
          <div><dt className="text-basalt-500">공실 기간</dt><dd>{listing.vacantMonths != null ? `${listing.vacantMonths}개월` : '-'}</dd></div>
          <div className="col-span-2 sm:col-span-3">
            <dt className="text-basalt-500">거주 가능 여부(공급자 의견)</dt>
            <dd>{LIVABLE_LABEL[listing.livableOpinion]} <span className="text-xs text-basalt-500">— 안전진단 결과가 아닙니다</span></dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-basalt-900">
          <Truck className="h-4 w-4 text-pine-600" aria-hidden /> 영농조건
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          <div><dt className="text-basalt-500">인근 작목</dt><dd>{listing.farm.crops.join(', ') || '-'}</dd></div>
          <div><dt className="text-basalt-500">농지 거리</dt><dd>{listing.farm.farmDistanceKm != null ? `${listing.farm.farmDistanceKm}km` : '확인되지 않음'}</dd></div>
          <div><dt className="text-basalt-500">차량 이동</dt><dd>{listing.farm.farmDriveMinutes != null ? `${listing.farm.farmDriveMinutes}분` : '확인되지 않음'}</dd></div>
          <div><dt className="text-basalt-500">1톤 트럭 진입</dt><dd>{TRI_LABEL[listing.farm.truckAccess]}</dd></div>
          <div><dt className="text-basalt-500">농기계 진입</dt><dd>{TRI_LABEL[listing.farm.machineAccess]}</dd></div>
          <div><dt className="text-basalt-500">주차</dt><dd>{listing.farm.parkingCount != null ? `${listing.farm.parkingCount}대` : '확인되지 않음'}</dd></div>
          <div className="flex items-center gap-1">
            <Warehouse className="h-3.5 w-3.5 text-basalt-500" aria-hidden />
            <dt className="text-basalt-500">창고</dt>
            <dd>{TRI_LABEL[listing.farm.hasStorage]}{listing.farm.storageAreaM2 != null && ` (${listing.farm.storageAreaM2}㎡)`}</dd>
          </div>
          <div><dt className="text-basalt-500">마당</dt><dd>{TRI_LABEL[listing.farm.hasYard]}{listing.farm.yardAreaM2 != null && ` (${listing.farm.yardAreaM2}㎡)`}</dd></div>
          <div><dt className="text-basalt-500">외부 수도</dt><dd>{TRI_LABEL[listing.farm.outdoorWater]}</dd></div>
        </dl>
        {listing.farm.note && <p className="mt-2 rounded-lg bg-leaf-100 p-2 text-xs text-basalt-700">{listing.farm.note}</p>}
      </Card>

      <Card>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-basalt-900">
          <Droplets className="h-4 w-4 text-pine-600" aria-hidden /> 생활조건
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
          <div><dt className="text-basalt-500">상수도</dt><dd>{TRI_LABEL[listing.living.waterSupply]}</dd></div>
          <div><dt className="text-basalt-500">전기</dt><dd>{TRI_LABEL[listing.living.electricity]}</dd></div>
          <div><dt className="text-basalt-500">난방</dt><dd>{listing.living.heating || '확인되지 않음'}</dd></div>
          <div><dt className="text-basalt-500">인터넷</dt><dd>{TRI_LABEL[listing.living.internetAvailable]}</dd></div>
          <div><dt className="text-basalt-500">정화조·하수도</dt><dd>{listing.living.sewage || '확인되지 않음'}</dd></div>
          <div><dt className="text-basalt-500">버스정류장</dt><dd>{listing.living.busStopDistanceM != null ? `${listing.living.busStopDistanceM}m` : '확인되지 않음'}</dd></div>
          <div><dt className="text-basalt-500">마트</dt><dd>{listing.living.martDistanceKm != null ? `${listing.living.martDistanceKm}km` : '확인되지 않음'}</dd></div>
          <div><dt className="text-basalt-500">병원·보건소</dt><dd>{listing.living.hospitalDistanceKm != null ? `${listing.living.hospitalDistanceKm}km` : '확인되지 않음'}</dd></div>
          <div><dt className="text-basalt-500">휴대전화 수신</dt><dd>{listing.living.mobileSignal === 'good' ? '양호' : listing.living.mobileSignal === 'weak' ? '약함' : '확인되지 않음'}</dd></div>
        </dl>
      </Card>

      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-basalt-900">
            <AlertTriangle className="h-4 w-4 text-citrus-600" aria-hidden /> 사진에서 확인된 상태
          </h2>
          {listing.isDemoAnalysis && (
            <span className="rounded-lg bg-leaf-200 px-1.5 py-0.5 text-[11px] font-medium text-pine-700">데모 분석 — 분석 결과 예시</span>
          )}
        </div>
        {listing.issues.length === 0 ? (
          <p className="text-sm text-basalt-500">공개된 분석 항목이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {listing.issues.map((i) => (
              <li key={i.id} className="rounded-lg border border-sand-200 p-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-basalt-900">{i.area} · {i.location}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${BURDEN_META[i.burden].cls}`}>
                    부담 {BURDEN_META[i.burden].label}
                  </span>
                  <span className="text-[11px] text-basalt-500">사진 {SUFFICIENCY_LABEL[i.sufficiency]} · 신뢰 {CONFIDENCE_LABEL[i.confidence]}</span>
                </div>
                <p className="mt-1 text-basalt-700">{i.observation}</p>
                <p className="mt-0.5 text-xs text-basalt-500">
                  {LIKELIHOOD_LABEL[i.repairLikelihood]}
                  {i.suspectedRepairs.length > 0 && ` · 의심 수리항목: ${i.suspectedRepairs.map((k) => REPAIR_ITEM_LABEL[k]).join(', ')}`}
                  {i.needsFieldCheck && ' · 현장 확인 필요'}
                </p>
                {i.note && <p className="mt-0.5 text-xs text-basalt-500">{i.note}</p>}
              </li>
            ))}
          </ul>
        )}
        {listing.uncheckable.length > 0 && (
          <div className="mt-3 rounded-lg bg-sand-100 p-2.5 text-xs text-basalt-700">
            <p className="font-medium">사진으로 판단할 수 없는 항목</p>
            <p className="mt-0.5">{listing.uncheckable.join(' · ')}</p>
          </div>
        )}
      </Card>

      {listing.estimate && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold text-basalt-900">예상 수리비 (참고 범위)</h2>
          <p className="text-lg font-bold text-pine-700">
            {listing.estimate.totalMinManwon.toLocaleString('ko-KR')} ~ {listing.estimate.totalMaxManwon.toLocaleString('ko-KR')}만 원
          </p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead>
                <tr className="border-b border-sand-200 text-basalt-500">
                  <th className="py-1.5 pr-2 font-medium">수리항목</th>
                  <th className="py-1.5 pr-2 font-medium">수량</th>
                  <th className="py-1.5 pr-2 font-medium">예상비용(만 원)</th>
                  <th className="py-1.5 font-medium">근거</th>
                </tr>
              </thead>
              <tbody>
                {listing.estimate.items.map((i) => (
                  <tr key={i.label} className="border-b border-sand-100">
                    <td className="py-1.5 pr-2">{i.label}</td>
                    <td className="py-1.5 pr-2">{i.needsFieldQuote ? '-' : `${i.quantity}${i.unit}`}</td>
                    <td className="py-1.5 pr-2">
                      {i.needsFieldQuote ? (
                        <span className="font-medium text-citrus-600">현장견적 필요</span>
                      ) : (
                        `${i.minCostManwon.toLocaleString('ko-KR')} ~ ${i.maxCostManwon.toLocaleString('ko-KR')}`
                      )}
                    </td>
                    <td className="py-1.5 text-basalt-500">{i.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-basalt-900">
          <ClipboardCheck className="h-4 w-4 text-pine-600" aria-hidden /> 방문 시 현장점검 체크리스트
        </h2>
        <ul className="grid grid-cols-1 gap-1 text-sm text-basalt-700 sm:grid-cols-2">
          {listing.fieldCheck.map((f) => (
            <li key={f} className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-pine-500" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-2">
        {listing.disclaimers.map((d) => (
          <p key={d} className="rounded-lg border border-sand-200 bg-sand-100 p-3 text-xs leading-relaxed text-basalt-700">
            {d}
          </p>
        ))}
      </div>
    </div>
  )
}
